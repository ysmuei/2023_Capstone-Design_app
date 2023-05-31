import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, FlatList, SafeAreaView, ActivityIndicator  } from 'react-native';
import { StyleSheet } from "react-native";
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Permissions from 'expo-permissions';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import {Image} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'


export default function App() {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingsList, setRecordingsList] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [responseData, setResponseData] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [isLoading, setIsLoading] = useState(false)
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    loadRecordings();
  }, []);


  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 10);
      }, 10);
    } else {
      setRecordingTime(0);
    }
    return () => {
      clearInterval(timer);
    };
  }, [isRecording]);
  const uploadRecording = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
  
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };
      const response = await axios.post(
        'http://172.30.60.3:5000/api/upload',
        formData,
        config
      );
    
  
      console.log('Recording uploaded successfully');
      console.log(response.data); // 서버 응답 내용 출력
        
       // 서버 응답 내용을 상태 변수에 저장
       return response;
       //responseData = response.data;
       
    } catch (error) {
      console.error('Failed to upload recording:', error);
    }
  };
  
  // 검사 버튼 클릭 시 서버로 음성 파일 전송
  const handleCheckButton = async (fileName) => {
    setIsLoading(true);//로딩 상태 시작
    try {
      const directory = `${FileSystem.documentDirectory}recordings/`;
      const fileUri = `${directory}${fileName}`;
      const file = {
        uri: fileUri,
        type: "audio/x-caf", //x-caf// .caf파일 형식에 맞게 설정
        name: fileName,
      };
      
      //await uploadRecording(file, responseData); // responseData를 인수로 전달합니다.
      const response = await uploadRecording(file, response);
      const accuracyString = response.data.substring(2,6); // "[0.29971]"에서 첫 번째 요소 추출
      const accuracy = parseFloat(accuracyString) * 100; // 반환된 값을 실수로 변환하고 100을 곱하여 퍼센트로 표시
      
      const accu = response.data
      const accuFl = parseFloat(accu)
      //setAccuracy(accu)
      setAccuracy(accuracy.toFixed(1));
      setResponseData(response.data);
      setIsLoading(false);//로딩 상태 종료
    } catch (error) {
      console.error('Failed to handle check button:', error);
      setIsLoading(false);//로딩 상태 종료

    }
  };
  const loadRecordings = async () => {
    try {
      const directory = `${FileSystem.documentDirectory}recordings/`;
      const { exists } = await FileSystem.getInfoAsync(directory);
      if (exists) {
        const files = await FileSystem.readDirectoryAsync(directory);
        files.sort();
        setRecordingsList(files);
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
      if (status !== 'granted') {
        throw new Error('Audio recording permission not granted');
      }
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.startAsync();
      setRecording(recording);
      setIsRecording(true);
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      setIsRecording(false);
      console.log('Recording stopped and stored at', recording.getURI());
      await saveRecording(recording.getURI());
      loadRecordings();
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const saveRecording = async (uri) => {
    try {
      const date = new Date();
      const month = String(date.getMonth()+1);
      const days = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      const fileName = `(${month}.${days})${hours}h${minutes}m${seconds}s.caf`;
      const directory = `${FileSystem.documentDirectory}recordings/`;
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      await FileSystem.moveAsync({
        from: uri,
        to: `${directory}${fileName}`,
      });
      console.log('Recording saved successfully');
    } catch (error) {
      console.error('Failed to save recording:', error);
    }
  };
  const deleteRecording = async (fileName) => {
    try {
      const directory = `${FileSystem.documentDirectory}recordings/`;
      const fileUri = `${directory}${fileName}`;
      await FileSystem.deleteAsync(fileUri);
      console.log('Recording deleted:', fileName);
      loadRecordings();
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  };

  const playRecording = async (fileName) => {
    try {
      const directory = `${FileSystem.documentDirectory}recordings/`;
      const fileUri = `${directory}${fileName}`;
      const sound = new Audio.Sound();
      await sound.loadAsync({ uri: fileUri });
      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play recording:', error);
    }
  };

  const MAX_FILENAME_LENGTH = 20; // 최대 파일 이름 길이

  const shortenFileName = (fileName) => {
    if (fileName.length <= MAX_FILENAME_LENGTH) {
      return fileName; // 파일 이름이 최대 길이보다 작을 경우 그대로 반환
    }
    const shortenedName = fileName.substring(0, MAX_FILENAME_LENGTH - 3) + '...'; // 최대 길이 이상일 경우 일부만 추출하고 '...'을 추가
    return shortenedName;
  };

  const renderRecordingItem = ({ item, index }) => {
    const shortenedName = shortenFileName(item);
    const count = index + 1;
    return (
      <View style={styles.view_Flist}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flex: 1,
          }}
        >
          <Text style={styles.list_count}>{count}</Text>
          <Text style={styles.list_name}>{shortenedName}</Text>
          {/* <Text style={styles.list_time}>00:03</Text> */}
          <TouchableOpacity
            onPress={() => {
              //setIsLoading(true);
              playRecording(item); 
              handleCheckButton(item, responseData);
              //setIsLoading(false)
            }}
          >
            <Icon
              style={{ marginLeft: 20 }}
              name="play"
              size={25}
              color="white"
            />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => deleteRecording(item)}>
            <Icon name="trash" size={25} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    //<SafeAreaView style={{ flex: 1, backgroundColor: '#0E0039, #0E0019' }}>
      <View style={styles.view1}>
        {isLoading && (
            <View style={{position: 'absolute',
            top: 100,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'white',}}>
              <ActivityIndicator size="large" color="#FFFFFF"/>
            </View>  
          )}
        <View style={styles.TopView}>
          {isRecording && <Text style={styles.recordingTime}>
            {new Date(recordingTime).toISOString().substr(14, 8)}
            {/* {recordingTime / 1000} */}
            </Text>}
            
          <View style={{ flex: 1 }}>
            <Image
              source={require("./assets/images/image1.png")}
              style={{ marginTop: -30 }}
            />
            <TouchableOpacity style={styles.micBtn} onPress={isRecording ? stopRecording : startRecording}>
              <Icon
                style={{ marginTop: 40, marginLeft: 7 }}
                name={isRecording ? "stop" : "mic"}
                size={70}
                color="white"
              />
            </TouchableOpacity>
          </View>
          <View>
            <Text style={{ color: "white", marginBottom: 20 }}>
              {isRecording ? 'Recording Stop ': 'Recording Start'}
            </Text>
          </View>
          <View style={styles.accuracy}>
            <Text style={{ color: "#DF84DD", fontSize: 30, fontWeight: 200, }}>
              Accuracy {accuracy} %
            </Text>
          </View>
        </View>
        <LinearGradient colors={['rgba(14, 0, 57, 0)', '#0E0039', '#0E0019']} style={styles.linear}>
          <FlatList
            style={styles.FList}
            data={recordingsList}
            renderItem={renderRecordingItem}
            keyExtractor={(item) => item}
          />
        </LinearGradient>
      </View>
    //</SafeAreaView>
  );
}
const styles = StyleSheet.create({
  view1: {
    backgroundColor: '#0E0039',
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  TopView: {
    marginTop: 50,
    flex: 1.3,
    width: "100%",
    flexDirection: "colum",
    alignItems: "center",
    backgroundColor: "#0E0039",
  },
  micBtn: {
    flex: 1,
    shadowColor: "rgba(218, 114, 255, 0.41)",
    shadowOpacity: 1,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    width: 160,
    height: 160,
    left: 120,
    top: 129,
    position: "absolute",
    alignItems: "center",
    borderRadius: 100,
    backgroundColor: "#0E0039",
  },
  accuracy: {
    width: 234,
    height: 50,
    shadowColor: "rgba(218, 114, 255, 0.41)",
    marginBottom: 5,
    shadowOpacity: 1,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 40,
    backgroundColor: "#100042",
  },
  recordingTime: {
    width: 200,
    color: "white",
    position: "absolute",
    left: 120,
    top: 30,
    fontSize: 40,
    fontWeight: 200,
  },
  linear: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0E0039",
  },
  view_text_rc: {
    width: 150,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  view_Flist: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginVertical: 8,
    borderRadius: 8,
    borderColor: "#7EBBFF",
    borderWidth: 1,
    color: "white",
  },
  list_name: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 400,
    color: "#EFE3FF",
  },
  list_count: {
    color: "#7EBBFF",
    marginLeft: 13,
  },
  list_time: {
    color: "#7EBBFF",
    marginLeft: 30,
  },
  FList: {
    flex: 1,
    marginTop: 10,
    width: "95%",
  },
});