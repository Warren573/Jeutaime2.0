import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { REFUGE_BACKGROUND_EXACT_DATA_URI } from '../assets/refugeBackgroundExact';
import { AnimalIllustration } from '../components/AnimalIllustration';
import { isRefugeAnimal } from '../data/refugeAnimals';
import { type RefugeActionType } from '../data/refugeActions';
import { useRefugeDailyChoices } from '../hooks/useRefugeDailyChoices';
import { useRefugeSession } from '../hooks/useRefugeSession';

const ACTIONS: Array<{ key: RefugeActionType; title: string; mark: string }> = [
  { key: 'feed', title: 'Nourrir', mark: '◉' },
  { key: 'pet', title: 'Câliner', mark: '♡' },
  { key: 'wash', title: 'Nettoyer', mark: '✧' },
  { key: 'play', title: 'Jouer', mark: '◌' },
];

export function RefugeSimplifiedScreen({ sessionIdProp }: { sessionIdProp: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const refuge = useRefugeSession(sessionIdProp);
  const { selectedMyActions, selectedGuessActions, toggleMyAction, toggleGuessAction, resetDay } = useRefugeDailyChoices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const artWidth = Math.min(width, 520);
  const artHeight = artWidth * 1.72;
  const animalSize = Math.min(220, artWidth * 0.48);
  const currentDay = Math.min(Math.max(refuge.currentDay || 1, 1), 7);
  const isWaiting = refuge.status === 'WAITING_FOR_ADOPTANT' || refuge.status === 'CREATION';
  const selected = refuge.role === 'adoptant' ? selectedGuessActions : selectedMyActions;
  const disabled = isWaiting || isSubmitting || (refuge.role === 'adopte' && refuge.adopteSubmittedToday) || (refuge.role === 'adoptant' && refuge.adoptantSubmittedToday);

  useEffect(() => { resetDay(); }, [refuge.currentDay, resetDay]);

  const handleAction = (action: RefugeActionType) => {
    if (disabled) return;
    if (refuge.role === 'adoptant') {
      if (!refuge.adopteSubmittedToday) return;
      toggleGuessAction(action);
    } else if (refuge.role === 'adopte') toggleMyAction(action);
  };

  const submit = async () => {
    if (isSubmitting || selected.length !== 2) return;
    setIsSubmitting(true);
    try {
      if (refuge.role === 'adoptant') await refuge.submitGuess(selectedGuessActions);
      else await refuge.submitDailyChoice(selectedMyActions);
    } finally { setIsSubmitting(false); }
  };

  if (refuge.isLoading) return <SafeAreaView style={styles.loading}><ActivityIndicator /><Text>Chargement du refuge…</Text></SafeAreaView>;

  const statusTitle = isWaiting ? "En attente d’un adoptant…" : refuge.role === 'adoptant' ? (refuge.adopteSubmittedToday ? 'À toi de le deviner…' : 'Ton compagnon réfléchit encore…') : refuge.adopteSubmittedToday ? 'Tes choix sont notés pour aujourd’hui' : 'Choisis deux gestes aujourd’hui';
  const statusBody = isWaiting ? 'Ton compagnon apparaîtra dans la liste des refuges disponibles. Le jeu commence dès qu’il est adopté.' : refuge.role === 'adoptant' ? (refuge.adopteSubmittedToday ? 'Choisis les deux gestes qui lui ressemblent le plus.' : 'Dès que ses choix sont faits, tu pourras essayer de les deviner.') : refuge.adopteSubmittedToday ? 'Il ne reste plus qu’à attendre la réponse de ton compagnon.' : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ImageBackground source={{ uri: REFUGE_BACKGROUND_EXACT_DATA_URI }} resizeMode="cover" style={[styles.scene, { width: artWidth, height: artHeight }]} imageStyle={styles.backgroundImage}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>← Retour</Text></TouchableOpacity>
          <View style={styles.titleBlock} pointerEvents="none"><Text style={styles.title}>Mon refuge</Text><Text style={styles.subtitle}>Prenez soin l’un de l’autre pendant 7 jours</Text></View>
          <View style={styles.calendar}>
            <View style={styles.rings}>{Array.from({ length: 9 }, (_, i) => <View key={i} style={styles.ring} />)}</View>
            <Text style={styles.calendarTitle}>7 jours ensemble</Text>
            <View style={styles.days}>{Array.from({ length: 7 }, (_, i) => { const day=i+1; const today=day===currentDay; const heart=refuge.hearts?.[i]; return <View key={day} style={styles.day}><Text style={[styles.dayNumber,today&&styles.today]}>{day}</Text><Text style={[styles.heart,heart==='❤️'&&styles.heartFull]}>{heart==='❤️'?'♥':today?'◐':'♡'}</Text></View>; })}</View>
            <Text style={styles.dayCaption}>Jour {currentDay} sur 7</Text>
          </View>
          <View style={styles.animal} pointerEvents="none">{isRefugeAnimal(refuge.companion?.animalType) && <AnimalIllustration animal={refuge.companion.animalType} size={animalSize} />}</View>
          <View style={styles.actions}>{ACTIONS.map(action => { const active=selected.includes(action.key); return <TouchableOpacity key={action.key} disabled={disabled} onPress={() => handleAction(action.key)} style={[styles.tag,active&&styles.tagActive,disabled&&!isWaiting&&styles.tagDisabled]}><View style={styles.string}/><View style={styles.hole}/><Text style={[styles.mark,active&&styles.markActive]}>{action.mark}</Text><Text style={styles.tagTitle}>{action.title}</Text></TouchableOpacity>; })}</View>
          <View style={styles.status}><View style={styles.tape}/><Text style={styles.statusTitle}>{statusTitle}</Text>{!!statusBody&&<Text style={styles.statusBody}>{statusBody}</Text>}{!isWaiting&&selected.length===2&&!disabled&&<TouchableOpacity style={styles.validate} onPress={submit}><Text style={styles.validateText}>{isSubmitting?'Envoi…':'Valider mes 2 choix'}</Text></TouchableOpacity>}</View>
        </ImageBackground>
      </ScrollView>
    </SafeAreaView>
  );
}

const parchment='#E8CFA6', ink='#4A2B1C', burgundy='#8A2F3C';
const styles=StyleSheet.create({
  container:{flex:1},scroll:{alignItems:'center'},scene:{position:'relative',overflow:'hidden'},backgroundImage:{width:'100%',height:'100%'},
  back:{position:'absolute',top:'4%',left:'4%',zIndex:22,padding:8},backText:{color:burgundy,fontFamily:'Georgia',fontSize:19,fontWeight:'700'},titleBlock:{position:'absolute',top:'3.3%',left:'25%',width:'60%',alignItems:'center',zIndex:22},title:{color:burgundy,fontFamily:'Georgia',fontSize:30},subtitle:{color:ink,fontFamily:'Georgia',fontSize:10.5,marginTop:5,textAlign:'center'},
  calendar:{position:'absolute',top:'18%',left:'25%',width:'50%',height:'19%',backgroundColor:parchment,borderWidth:1,borderColor:'#AE8458',borderRadius:4,paddingHorizontal:14,paddingTop:24,zIndex:10,shadowColor:'#231308',shadowOpacity:.3,shadowRadius:4,shadowOffset:{width:0,height:3}},rings:{position:'absolute',top:-9,left:12,right:12,flexDirection:'row',justifyContent:'space-between'},ring:{width:5,height:19,borderRadius:4,borderWidth:2,borderColor:'#4A3525',backgroundColor:'#B78A57'},calendarTitle:{textAlign:'center',color:ink,fontFamily:'Georgia',fontSize:17,marginBottom:10},days:{flexDirection:'row',justifyContent:'space-between'},day:{flex:1,alignItems:'center'},dayNumber:{color:ink,fontFamily:'Georgia',fontSize:14,fontWeight:'600'},today:{color:burgundy,fontWeight:'900'},heart:{color:'#9E876C',fontSize:18},heartFull:{color:burgundy},dayCaption:{color:'#6E4B32',fontFamily:'Georgia',fontStyle:'italic',fontSize:10.5,textAlign:'right',marginTop:3},
  animal:{position:'absolute',top:'38%',left:0,right:0,alignItems:'center',zIndex:12},actions:{position:'absolute',top:'61%',left:'4%',width:'92%',height:'17%',flexDirection:'row',justifyContent:'space-between',zIndex:16},tag:{width:'22.5%',height:'100%',backgroundColor:'rgba(239,211,167,.94)',borderWidth:1,borderColor:'#A77746',alignItems:'center',justifyContent:'center',paddingTop:12,shadowColor:'#261407',shadowOpacity:.25,shadowRadius:3,shadowOffset:{width:0,height:2}},tagActive:{borderWidth:3,borderColor:burgundy,backgroundColor:'#EACBA0'},tagDisabled:{opacity:.72},string:{position:'absolute',top:-13,width:2,height:20,backgroundColor:'#6B4B30'},hole:{position:'absolute',top:5,width:8,height:8,borderRadius:8,borderWidth:2,borderColor:'#7A5332',backgroundColor:'#BA966A'},mark:{color:'#74412F',fontFamily:'Georgia',fontSize:25,marginBottom:7},markActive:{color:burgundy},tagTitle:{color:ink,fontFamily:'Georgia',fontSize:13.5,fontWeight:'700',textAlign:'center'},
  status:{position:'absolute',top:'82%',left:'7%',width:'86%',minHeight:'13%',backgroundColor:'rgba(238,211,170,.95)',borderWidth:1,borderColor:'#A77548',paddingHorizontal:18,paddingVertical:15,alignItems:'center',zIndex:17,shadowColor:'#241208',shadowOpacity:.25,shadowRadius:3,shadowOffset:{width:0,height:2}},tape:{position:'absolute',top:-7,width:70,height:14,backgroundColor:'rgba(205,170,112,.76)'},statusTitle:{color:burgundy,fontFamily:'Georgia',fontWeight:'700',fontSize:18,textAlign:'center',marginBottom:6},statusBody:{color:ink,fontFamily:'Georgia',fontSize:10.5,lineHeight:14,textAlign:'center'},validate:{marginTop:8,backgroundColor:burgundy,paddingHorizontal:18,paddingVertical:8,borderRadius:3},validateText:{color:'#FFF2DE',fontFamily:'Georgia',fontWeight:'700',fontSize:11},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:10}
});