import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AnimalIllustration } from '../components/AnimalIllustration';
import { AppBackButton } from '../components/AppBackButton';
import { isRefugeAnimal } from '../data/refugeAnimals';
import { type RefugeActionType } from '../data/refugeActions';
import { RefugeBowl } from '../components/RefugeBowl';
import { useStore } from '../store/useStore';
import { useRefugeAnimation } from '../hooks/useRefugeAnimation';
import { useRefugeDailyChoices } from '../hooks/useRefugeDailyChoices';
import { useRefugeSession } from '../hooks/useRefugeSession';
import { sessionEndNotice, refugeErrorText } from '../data/refugeSessionState';

import { ANIMAL_FOODS, BOWL_IMAGES, FOOD_LABELS, type RefugeFood } from '../data/refugeBowls';

const REFUGE_BACKGROUND = require('../../assets/images/refuge/refuge-watercolor-bg.png');

const ACTIONS: Array<{ key: RefugeActionType; title: string; mark: string }> = [
  { key: 'feed', title: 'Nourrir', mark: 'feed' },
  { key: 'pet', title: 'Câliner', mark: '♡' },
  { key: 'wash', title: 'Laver', mark: 'wash' },
  { key: 'play', title: 'Jouer', mark: 'play' },
];

export function RefugeSimplifiedScreen({ sessionIdProp }: { sessionIdProp: string }) {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const refuge = useRefugeSession(sessionIdProp);
  const { selectedMyActions, selectedGuessActions, toggleMyAction, toggleGuessAction, resetDay } = useRefugeDailyChoices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [foodChoice, setFoodChoice] = useState<RefugeFood | null>(null);
  const userId = useStore(s => s.currentUser?.id);
  // Image du compagnon : calculée localement depuis les horodatages serveur, identique à la case de l'accueil.
  const frame = useRefugeAnimation({ animation: refuge.animation, serverOffsetMs: refuge.serverOffsetMs, userId, sessionId: refuge.sessionId });
  const animalState = frame.pose;
  const artWidth = Math.min(width, 520);
  const availableHeight = Math.max(height - insets.top - insets.bottom, artWidth * 1.72);
  const artHeight = availableHeight;
  const animalSize = Math.min(220, artWidth * 0.48);
  const currentDay = Math.min(Math.max(refuge.currentDay || 1, 1), 7);
  const isWaiting = refuge.status === 'WAITING_FOR_ADOPTANT' || refuge.status === 'CREATION';
  const selected = refuge.role === 'adoptant' ? selectedGuessActions : selectedMyActions;
  // Fin dépassée (le serveur renvoie isActive=false) : aucune action possible, on le dit au lieu de refuser en silence.
  const endNotice = sessionEndNotice(refuge.status, refuge.isActive);
  const ended = endNotice !== null;
  const disabled = isWaiting || ended || isSubmitting || (refuge.role === 'adopte' && refuge.adopteSubmittedToday) || (refuge.role === 'adoptant' && refuge.adoptantSubmittedToday);
  const bothParticipantsDone = refuge.adopteSubmittedToday && refuge.adoptantSubmittedToday;
  const hideActionsForToday = refuge.dayCompleted || bothParticipantsDone;

  const foods = isRefugeAnimal(refuge.companion?.animalType) ? ANIMAL_FOODS[refuge.companion.animalType] : [];
  const feeding = refuge.role === 'adoptant' && selected.includes('feed') && !hideActionsForToday && !refuge.adoptantSubmittedToday;
  // Gamelle des réactions : aliment enregistré, sinon le premier compatible (anciennes données).
  const reactionFood = frame.bowl ? (foods.find(food => food === frame.bowl?.food) ?? foods[0] ?? null) : null;
  const chosenFood = foods.length === 1 ? foods[0] : foodChoice && foods.includes(foodChoice) ? foodChoice : null;
  useEffect(() => { resetDay(); setFoodChoice(null); }, [sessionIdProp, refuge.currentDay, resetDay]);
  useEffect(() => { if (!feeding && !refuge.dayCompleted) setFoodChoice(null); }, [feeding, refuge.dayCompleted]);

  const handleAction = (action: RefugeActionType) => {
    if (disabled) return;
    refuge.clearSubmitError();
    if (refuge.role === 'adoptant') {
      if (!refuge.adopteSubmittedToday) return;
      toggleGuessAction(action);
    } else if (refuge.role === 'adopte') toggleMyAction(action);
  };

  const submit = async () => {
    if (isSubmitting || selected.length !== 2 || (feeding && !chosenFood)) return;
    setIsSubmitting(true);
    try {
      if (refuge.role === 'adoptant') await refuge.submitGuess(selectedGuessActions, feeding ? chosenFood ?? undefined : undefined);
      else await refuge.submitDailyChoice(selectedMyActions);
    } finally { setIsSubmitting(false); }
  };

  if (refuge.isLoading) return <SafeAreaView style={styles.loading}><ActivityIndicator /><Text>Chargement du refuge…</Text></SafeAreaView>;

  const sponsor = refuge.sponsorRole === 'parrain' ? 'ton parrain' : refuge.sponsorRole === 'marraine' ? 'ta marraine' : null;
  const visitMessage = sponsor
    ? `${sponsor === 'ton parrain' ? 'Ton parrain est passé' : 'Ta marraine est passée'} au Refuge. Viens voir ce qui t’attend !`
    : 'Tu as de la visite au Refuge ! Viens voir ce qui t’attend.';

  const errorText = refugeErrorText(refuge.submitError ?? refuge.error);

  const statusTitle = hideActionsForToday
    ? 'Journée terminée'
    : endNotice
      ? endNotice.title
    : isWaiting
      ? "Tu viens d’incarner un animal."
      : refuge.role === 'adoptant'
        ? (refuge.adopteSubmittedToday ? 'Ton compagnon s’est réveillé et t’attend.' : 'Ton compagnon réfléchit encore…')
        : refuge.adopteSubmittedToday
          ? 'Tes choix sont notés pour aujourd’hui'
          : 'Choisis deux actions aujourd’hui';

  const statusBody = hideActionsForToday
    ? (refuge.todayResult?.message || 'Rendez-vous demain pour la suite du Refuge.')
    : endNotice
      ? endNotice.body
    : isWaiting
      ? 'Ton aventure commence dès que quelqu’un t’adopte.'
      : refuge.role === 'adoptant'
        ? (refuge.adopteSubmittedToday ? 'Choisis les deux actions qui lui ressemblent le plus.' : 'Dès que ses choix sont faits, tu pourras essayer de les deviner.')
        : refuge.adopteSubmittedToday
          ? (sponsor ? `Il ne reste plus qu’à attendre la réponse de ${sponsor}.` : 'Tu attends encore une réponse.')
          : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        <ImageBackground source={REFUGE_BACKGROUND} resizeMode="cover" style={[styles.scene, { width: artWidth, height: artHeight + insets.bottom }]} imageStyle={styles.backgroundImage}>
          <View style={{ height: artHeight }}>
          <AppBackButton style={styles.back} onPress={() => router.back()} />
          <View style={styles.titleBlock} pointerEvents="none"><Text style={styles.title}>{refuge.role === 'adoptant' ? 'Ton compagnon' : 'Ton refuge'}</Text><Text style={styles.subtitle}>Prenez soin l’un de l’autre pendant 7 jours</Text></View>
          <View style={styles.calendar}>
            <View style={styles.rings}>{Array.from({ length: 9 }, (_, i) => <View key={i} style={styles.ring} />)}</View>
            <Text style={styles.calendarTitle}>7 jours ensemble</Text>
            <View style={styles.days}>{Array.from({ length: 7 }, (_, i) => { const day=i+1; const today=day===currentDay; const heart=refuge.hearts?.[i]; return <View key={day} style={styles.day}><Text style={[styles.dayNumber,today&&styles.today]}>{day}</Text><Text style={[styles.heart,heart==='❤️'&&styles.heartFull]}>{heart==='❤️'?'♥':today?'◐':'♡'}</Text></View>; })}</View>
            <Text style={styles.dayCaption}>Jour {currentDay} sur 7</Text>
          </View>
          <View style={styles.animal} pointerEvents="none">{isRefugeAnimal(refuge.companion?.animalType) && <AnimalIllustration animal={refuge.companion.animalType} state={animalState} size={animalSize} />}</View>
          {frame.bowl && reactionFood && <RefugeBowl food={reactionFood} level={frame.bowl.level} artWidth={artWidth} />}
          {!frame.bowl && feeding && chosenFood && <RefugeBowl food={chosenFood} level="full" artWidth={artWidth} />}
          {feeding && foods.length > 1 && <View style={{position:'absolute',top:'65%',left:'6.5%',width:'52%',flexDirection:'row',gap:4,zIndex:15}}>{foods.map(food => <TouchableOpacity accessibilityRole="button" accessibilityLabel={FOOD_LABELS[food]} accessibilityState={{selected:chosenFood===food}} key={food} onPress={()=>setFoodChoice(food)} style={{flex:1,minWidth:0,backgroundColor:parchment,borderRadius:8,borderWidth:chosenFood===food?2:1,borderColor:burgundy,paddingVertical:4,paddingHorizontal:2,alignItems:'center'}}><Image source={BOWL_IMAGES[food]} style={{width:34,height:34}} resizeMode="contain"/><Text numberOfLines={1} style={{color:ink,fontSize:9.5}}>{FOOD_LABELS[food]}</Text></TouchableOpacity>)}</View>}
          {hideActionsForToday ? (
            <View style={styles.dayDone}>
              <Text style={styles.dayDoneTitle}>C’est tout pour aujourd’hui</Text>
              <Text style={styles.dayDoneText}>
                {refuge.role === 'adopte' && bothParticipantsDone
                  ? visitMessage
                  : 'Vous avez tous les deux terminé pour aujourd’hui.'}
              </Text>
            </View>
          ) : (
            <View style={styles.actions}>{ACTIONS.map(action => { const active=selected.includes(action.key); return <TouchableOpacity key={action.key} disabled={disabled} onPress={() => handleAction(action.key)} style={[styles.tag,active&&styles.tagActive,disabled&&!isWaiting&&styles.tagDisabled]}>{action.mark==='feed' ? <View style={{width:30,height:30,flexDirection:'row',justifyContent:'center',gap:7,marginBottom:3}}><View style={{alignItems:'center'}}><View style={{flexDirection:'row',gap:2}}>{[0,1,2].map(i=><View key={i} style={{width:2,height:10,backgroundColor:burgundy}}/>)}</View><View style={{width:10,height:2,backgroundColor:burgundy}}/><View style={{width:2,height:15,backgroundColor:burgundy}}/></View><View style={{width:6,height:27,borderLeftWidth:2,borderTopWidth:2,borderColor:burgundy,borderTopLeftRadius:5}}/></View> : action.mark==='wash' ? <View style={{width:30,height:30,marginBottom:3}}>{[[1,12,15],[16,1,11],[21,20,7],[2,1,6]].map(([left,top,size],i)=><View key={i} style={{position:'absolute',left,top,width:size,height:size,borderRadius:size/2,borderWidth:1.5,borderColor:burgundy}}/>)}</View> : action.mark==='play' ? <View style={{width:27,height:27,borderRadius:14,borderWidth:1.5,borderColor:burgundy,overflow:'hidden',marginBottom:3}}><View style={{position:'absolute',left:6,top:-3,width:12,height:32,borderRadius:10,borderWidth:1.5,borderColor:burgundy,transform:[{rotate:'35deg'}]}}/><View style={{position:'absolute',left:-3,top:8,width:32,height:10,borderRadius:10,borderWidth:1.5,borderColor:burgundy,transform:[{rotate:'35deg'}]}}/></View> : <Text style={[styles.mark,active&&styles.markActive]}>{action.mark}</Text>}<Text style={styles.tagTitle}>{action.title}</Text></TouchableOpacity>; })}</View>
          )}
          <View style={styles.status}><View style={styles.tape}/><Text style={styles.statusTitle}>{statusTitle}</Text>{!!statusBody&&<Text style={styles.statusBody}>{statusBody}</Text>}{!!errorText&&<Text accessibilityRole="alert" style={styles.statusError}>{errorText}</Text>}{!isWaiting&&selected.length===2&&!disabled&&(!feeding||!!chosenFood)&&<TouchableOpacity style={styles.validate} onPress={submit}><Text style={styles.validateText}>{isSubmitting?'Envoi…':'Valider mes 2 choix'}</Text></TouchableOpacity>}</View>
          </View>
        </ImageBackground>
      </ScrollView>
    </SafeAreaView>
  );
}

const parchment='#E8CFA6', ink='#4A2B1C', burgundy='#8A2F3C';
const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:'#F3E8D6'},scroll:{flexGrow:1,alignItems:'center',justifyContent:'flex-start'},scene:{position:'relative',overflow:'visible',marginBottom:60},backgroundImage:{width:'100%',height:'100%'},
  back:{position:'absolute',top:'4%',left:'4%',zIndex:22},titleBlock:{position:'absolute',top:'3.3%',left:'25%',width:'60%',alignItems:'center',zIndex:22},title:{color:burgundy,fontFamily:'Georgia',fontSize:30},subtitle:{color:ink,fontFamily:'Georgia',fontSize:10.5,marginTop:5,textAlign:'center'},
  calendar:{position:'absolute',top:'17%',left:'29%',width:'42%',height:'12%',backgroundColor:parchment,borderWidth:1,borderColor:'#AE8458',borderRadius:12,paddingHorizontal:11,paddingTop:15,zIndex:10,shadowColor:'#231308',shadowOpacity:.3,shadowRadius:4,shadowOffset:{width:0,height:3}},rings:{position:'absolute',top:-7,left:10,right:10,flexDirection:'row',justifyContent:'space-between'},ring:{width:4,height:15,borderRadius:4,borderWidth:2,borderColor:'#4A3525',backgroundColor:'#B78A57'},calendarTitle:{textAlign:'center',color:ink,fontFamily:'Georgia',fontSize:15,marginBottom:4},days:{flexDirection:'row',justifyContent:'space-between'},day:{flex:1,alignItems:'center'},dayNumber:{color:ink,fontFamily:'Georgia',fontSize:12,fontWeight:'600'},today:{color:burgundy,fontWeight:'900'},heart:{color:'#9E876C',fontSize:15},heartFull:{color:burgundy},dayCaption:{color:'#6E4B32',fontFamily:'Georgia',fontStyle:'italic',fontSize:9,textAlign:'right',marginTop:0},
  animal:{position:'absolute',top:'40%',left:0,right:0,alignItems:'center',zIndex:12},actions:{position:'absolute',top:'73%',left:'6.5%',width:'87%',height:'9.5%',flexDirection:'row',justifyContent:'space-between',zIndex:16},dayDone:{position:'absolute',top:'73%',left:'10%',width:'80%',minHeight:'10.5%',backgroundColor:'rgba(239,211,167,.95)',borderWidth:1,borderColor:'#A77746',borderRadius:12,alignItems:'center',justifyContent:'center',paddingHorizontal:18,paddingVertical:12,zIndex:16,shadowColor:'#261407',shadowOpacity:.22,shadowRadius:3,shadowOffset:{width:0,height:2}},dayDoneTitle:{color:burgundy,fontFamily:'Georgia',fontSize:17,fontWeight:'700',textAlign:'center',marginBottom:5},dayDoneText:{color:ink,fontFamily:'Georgia',fontSize:10.5,lineHeight:14,textAlign:'center'},tag:{width:'23%',height:'100%',backgroundColor:'rgba(239,211,167,.94)',borderWidth:1,borderColor:'#A77746',borderRadius:12,alignItems:'center',justifyContent:'center',paddingTop:0,shadowColor:'#261407',shadowOpacity:.25,shadowRadius:3,shadowOffset:{width:0,height:2}},tagActive:{borderWidth:3,borderColor:burgundy,backgroundColor:'#EACBA0'},tagDisabled:{opacity:.72},string:{position:'absolute',top:-10,width:2,height:15,backgroundColor:'#6B4B30'},hole:{position:'absolute',top:3,width:7,height:7,borderRadius:7,borderWidth:2,borderColor:'#7A5332',backgroundColor:'#BA966A'},paw:{width:30,height:30,alignItems:'center',justifyContent:'center',marginBottom:3},pawToes:{flexDirection:'row',gap:2},pawToe:{width:6,height:9,borderRadius:5,borderWidth:1.5,borderColor:burgundy},pawPad:{width:17,height:13,borderRadius:8,borderWidth:1.5,borderColor:burgundy,marginTop:1},mark:{color:burgundy,fontFamily:'Georgia',fontSize:28,marginBottom:3},markActive:{color:burgundy},tagTitle:{color:ink,fontFamily:'Georgia',fontSize:13,fontWeight:'700',textAlign:'center'},
  status:{position:'absolute',top:'85.5%',left:'6.5%',width:'87%',minHeight:'8.5%',backgroundColor:'rgba(238,211,170,.95)',borderWidth:1,borderColor:'#A77548',borderRadius:12,paddingHorizontal:18,paddingVertical:15,alignItems:'center',zIndex:17,shadowColor:'#241208',shadowOpacity:.25,shadowRadius:3,shadowOffset:{width:0,height:2}},tape:{position:'absolute',top:-7,width:70,height:14,backgroundColor:'rgba(205,170,112,.76)'},statusTitle:{color:burgundy,fontFamily:'Georgia',fontWeight:'700',fontSize:18,textAlign:'center',marginBottom:6},statusBody:{color:ink,fontFamily:'Georgia',fontSize:10.5,lineHeight:14,textAlign:'center'},statusError:{color:burgundy,fontFamily:'Georgia',fontWeight:'700',fontSize:11,lineHeight:15,textAlign:'center',marginTop:6},validate:{marginTop:8,backgroundColor:burgundy,paddingHorizontal:18,paddingVertical:8,borderRadius:3},validateText:{color:'#FFF2DE',fontFamily:'Georgia',fontWeight:'700',fontSize:11},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:10}
});