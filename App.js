import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, FlatList } from 'react-native';
import { StyleSheet } from "react-native";
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Permissions from 'expo-permissions';
import axios from 'axios';

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
      'http://172.30.40.21:5000/api/upload',
      formData,
      config
    );
  

    console.log('Recording uploaded successfully');
    console.log(response.data); // 서버 응답 내용 출력

     // 서버 응답 내용을 상태 변수에 저장
     return response;
     //responseData = response.data;
     //setResponseData(response.data);
  } catch (error) {
    console.error('Failed to upload recording:', error);
  }
};

// 검사 버튼 클릭 시 서버로 음성 파일 전송
const handleCheckButton = async (fileName) => {
  try {
    const directory = `${FileSystem.documentDirectory}recordings/`;
    const fileUri = `${directory}${fileName}`;
    const file = {
      uri: fileUri,
      type: 'audio/x-caf', //x-caf// MP3 파일 형식에 맞게 설정
      name: fileName,
    };

    //await uploadRecording(file, responseData); // responseData를 인수로 전달합니다.
    const response = await uploadRecording(file);
    //await uploadRecording(file);
    // 상태 변수에 저장된 응답 내용을 화면에 출력
    console.log(responseData);
    setResponseData(response.data);
  } catch (error) {
    console.error('Failed to handle check button:', error);
  }
};

export default function App() {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingsList, setRecordingsList] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  //const [responseData, setResponseData] = useState('');
  const [responseData, setResponseData] = useState(null);

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
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      clearInterval(timer);
    };
  }, [isRecording]);

  const loadRecordings = async () => {
    try {
      const directory = `${FileSystem.documentDirectory}recordings/`;
      const { exists } = await FileSystem.getInfoAsync(directory);
      if (exists) {
        const files = await FileSystem.readDirectoryAsync(directory);
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
      //const fileName = uri.split('/').pop();
      const date = new Date();
      const year = String(date.getFullYear());
      const month = String(date.getMonth()+1);
      const days = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      const fileName = `(${month}.${days})${hours}${minutes}${seconds}.caf`;
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

  const renderRecordingItem = ({ item }) => {
    const shortenedName = shortenFileName(item);

    return (
      <View style={styles.view_Flist}>
        <View style={{flexDirection:'row'}}>
          <Text style={{ marginHorizontal: 10, flex: 0.9, fontSize: 18, color: 'white' }}>{shortenedName}</Text>
          <TouchableOpacity onPress={() => playRecording(item)}>
            <Text style={styles.PlayText}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteRecording(item)}>
            <Text style={{ color: '#F53730', fontSize: 18 }}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.checkBT} onPress={() => handleCheckButton(item, responseData)}>
            <Text style={{ fontSize: 18 }}>검사</Text>
          </TouchableOpacity>
        </View>
        <View>
          {responseData && (
            <Text style={styles.responseText}>{responseData}</Text>
          )}
          {/* <Text>정확도 : {responseData}</Text> */}
        </View>

      </View>
    );
  };

  return (
    <View style={styles.view1}>
      <View style={styles.TopView}>
        <View style={[styles.view_text_rc, { backgroundColor: isRecording ? '#26EB1D' : '#F53730' }]}>
          <Text style={styles.text_rc}>{isRecording ? 'Recording...' : 'Not Recording'}</Text>
        </View>
        <TouchableOpacity style={styles.textStart} onPress={isRecording ? stopRecording : startRecording}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 600 }}>{isRecording ? '정지' : '시작'}</Text>
          {isRecording && <Text style={styles.recordingTime}>{recordingTime}s</Text>}
        </TouchableOpacity>
      </View>
      
      <FlatList
        style = {styles.FList}
        data={recordingsList}
        renderItem={renderRecordingItem}
        keyExtractor={(item) => item}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  view1: {
    backgroundColor: "rgba(50,50,50,1)",
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  TopView:{
    width: 300,
    marginTop: 70,
    flexDirection: "row",
    justifyContent: 'space-around',
    alignItems: "center",
  },
  PlayText:{
    flexDirection: 'row',
    width: 50,
    height: 30,
    color : '#1E34D6', 
    textAlign:'center',
    marginRight:10, 
    fontSize: 18,
    backgroundColor: 'white',
  },
  view_text_rc:{
    width: 150,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  view_Flist:{
    height: 60,
    flexDirection: "column", 
    alignItems: 'center' , 
    marginTop: 20,
    borderRadius: 10,
    borderColor: "white",
    borderWidth: 1,
    color: "white",
  },
  text_rc:{
    fontSize: 19,
    fontWeight: 600
  },
  recordingTime: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  textStart: {
    width: 100,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'purple',
    borderRadius: 20,
  },
  FList:{
    flex: 1,
    marginTop: 10,
    width : '90%',
  },
  checkBT:{
    width:50,
    height:30,
    marginLeft:10,
    backgroundColor : 'gray',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  }
});