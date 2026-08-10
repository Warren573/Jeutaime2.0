import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getOfferingHistory, getReceivedOfferings } from '../api/offerings';
import type { OfferingSentDTO } from '../api/offerings';
import { useStore } from '../store/useStore';
import { AppBackButton } from '../components/AppBackButton';

const DESK_BG = require('../../assets/images/offerings/desk-bg.jpg');
type DeskTab = 'active' | 'history';

const OFFERING_IMAGES: Record<string, any> = {
  desk_chocolats: require('../../assets/images/offerings/desk/BOITE DE CHOCOLATS.png'),
  desk_bouquet: require('../../assets/images/offerings/desk/BOUQUET DE FLEURS.png'),
  desk_rose: require('../../assets/images/offerings/desk/ROSE ETERNELLE.png'),
};

// Taille visuelle dans le décor du bureau, réglable objet par objet.
const DESK_IMAGE_SIZES: Record<string, { width: number; height: number }> = {
  desk_chocolats: { width: 148, height: 108 },
  desk_bouquet: { width: 152, height: 198 },
  desk_rose: { width: 108, height: 214 },
};
const DEFAULT_DESK_IMAGE_SIZE = { width: 112, height: 132 };

// Emplacements physiques réservés sur le bureau. Ils sont relatifs AU BUREAU,
// et non à la fenêtre du navigateur : cela évite que plusieurs objets arrivent
// au même endroit dans l'émulation mobile web.
const DESK_SLOTS = [
  { left: '8%', top: '25%', width: 150, height: 220, rotation: '-2deg' },
  { left: '53%', top: '27%', width: 158, height: 220, rotation: '2deg' },
  { left: '16%', top: '49%', width: 158, height: 170, rotation: '1deg' },
  { left: '55%', top: '50%', width: 150, height: 180, rotation: '-2deg' },
  { left: '8%', top: '68%', width: 145, height: 165, rotation: '2deg' },
  { left: '43%', top: '69%', width: 145, height: 165, rotation: '-1deg' },
  { left: '65%', top: '80%', width: 125, height: 145, rotation: '2deg' },
  { left: '22%', top: '82%', width: 130, height: 145, rotation: '-2deg' },
] as const;

// Les trois objets actuels gardent toujours leur propre emplacement.
// Les futures offrandes utilisent ensuite les emplacements encore libres.
const FIXED_SLOT_BY_OFFERING: Record<string, number> = {
  desk_rose: 0,
  desk_bouquet: 1,
  desk_chocolats: 2,
};

function assignDeskSlots(items: OfferingSentDTO[]) {
  const occupied = new Set<number>();
  return items.slice(0, DESK_SLOTS.length).map((item) => {
    const preferred = FIXED_SLOT_BY_OFFERING[item.offering.id];
    let slotIndex = preferred !== undefined && !occupied.has(preferred) ? preferred : -1;
    if (slotIndex < 0) slotIndex = DESK_SLOTS.findIndex((_, index) => !occupied.has(index));
    if (slotIndex < 0) slotIndex = 0;
    occupied.add(slotIndex);
    return { item, slotIndex };
  });
}

export default function ReceivedOfferingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const matches = useStore((s) => s.matches);
  const [activeOfferings, setActiveOfferings] = useState<OfferingSentDTO[]>([]);
  const [historyOfferings, setHistoryOfferings] = useState<OfferingSentDTO[]>([]);
  const [tab, setTab] = useState<DeskTab>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError(null);
        const [active, history] = await Promise.all([getReceivedOfferings(1, 100, true), getOfferingHistory()]);
        setActiveOfferings(active.filter((i) => i.offering.id.startsWith('desk_') && i.isActive && i.consumptionCount < 3));
        setHistoryOfferings(history.filter((i) => i.offering.id.startsWith('desk_')));
      } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de chargement'); }
      finally { setLoading(false); }
    };
    void load();
  }, []);

  const senderName = (fromUserId: string) => {
    const match = matches?.find((m) => m.userAId === fromUserId || m.userBId === fromUserId);
    return match?.otherProfile?.pseudo || 'Quelqu’un';
  };
  const visibleOfferings = useMemo(() => tab === 'active' ? activeOfferings : historyOfferings, [activeOfferings, historyOfferings, tab]);
  const placedOfferings = useMemo(() => assignDeskSlots(activeOfferings), [activeOfferings]);

  return <View style={styles.container}>
    <View style={styles.deskBgLayer} pointerEvents="none"><Image source={DESK_BG} style={styles.deskBgImage} resizeMode="cover" /></View>
    <AppBackButton onPress={() => router.back()} tone="inverse" style={[styles.backBtn, { top: insets.top + 10 }]} />
    <View style={[styles.header, { top: insets.top + 12 }]} pointerEvents="none"><Text style={styles.title}>Bureau d’offrandes</Text><Text style={styles.subtitle}>Les attentions que l’on t’a laissées</Text></View>
    <View style={[styles.tabs, { top: insets.top + 72 }]}><TouchableOpacity activeOpacity={.8} onPress={() => setTab('active')} style={[styles.tab, tab === 'active' && styles.tabActive]}><Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>Sur le bureau · {activeOfferings.length}</Text></TouchableOpacity><TouchableOpacity activeOpacity={.8} onPress={() => setTab('history')} style={[styles.tab, tab === 'history' && styles.tabActive]}><Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>Mes offrandes · {historyOfferings.length}</Text></TouchableOpacity></View>
    {loading ? <View style={styles.centerContent}><ActivityIndicator size="large" color="#F4E8CE" /></View> : error ? <View style={styles.centerContent}><Text style={styles.feedbackText}>{error}</Text></View> : visibleOfferings.length === 0 ? <View style={styles.centerContent}><Text style={styles.feedbackText}>{tab === 'active' ? 'Le bureau est encore vide…' : 'Aucune offrande dans les 6 derniers mois.'}</Text></View> : tab === 'active' ? <View style={styles.deskSurface} pointerEvents="box-none">
      {placedOfferings.map(({ item, slotIndex }) => {
        const slot = DESK_SLOTS[slotIndex];
        const image = OFFERING_IMAGES[item.offering.id];
        const size = DESK_IMAGE_SIZES[item.offering.id] ?? DEFAULT_DESK_IMAGE_SIZE;
        return <View key={item.id} style={[styles.deskObjectSlot, { left: slot.left, top: slot.top, width: slot.width, height: slot.height, transform: [{ rotate: slot.rotation }] }]}>{image ? <Image source={image} style={{ width: size.width, height: size.height }} resizeMode="contain" /> : <Text style={styles.objectEmoji}>{item.offering.emoji}</Text>}</View>;
      })}
    </View> : <View style={[styles.historyGrid, { paddingTop: insets.top + 132, paddingBottom: insets.bottom + 30 }]}>{historyOfferings.slice(0, 12).map((item) => { const image = OFFERING_IMAGES[item.offering.id]; return <View key={item.id} style={styles.historySlot}>{image ? <Image source={image} style={styles.historyImage} resizeMode="contain" /> : <Text style={styles.historyEmoji}>{item.offering.emoji}</Text>}<Text style={styles.offeringName} numberOfLines={1}>{item.offering.name}</Text><Text style={styles.offeringSender} numberOfLines={1}>de {senderName(item.fromUserId)}</Text><Text style={styles.offeringDate}>{new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</Text></View>; })}</View>}
  </View>;
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#171411'},deskBgLayer:Platform.OS==='web'?({position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:0} as any):{...StyleSheet.absoluteFillObject,zIndex:0},deskBgImage:{width:'100%',height:'100%'},backBtn:{position:'absolute',left:16,zIndex:4},header:{position:'absolute',left:96,right:18,zIndex:3,alignItems:'center'},title:{color:'#F5E6C8',fontFamily:'Georgia',fontSize:24,lineHeight:29,fontWeight:'700',textAlign:'center',textShadowColor:'rgba(0,0,0,.78)',textShadowOffset:{width:0,height:1},textShadowRadius:4},subtitle:{color:'#E8D8BC',fontFamily:'Georgia',fontSize:11,lineHeight:15,fontStyle:'italic',textAlign:'center',textShadowColor:'rgba(0,0,0,.78)',textShadowOffset:{width:0,height:1},textShadowRadius:4},tabs:{position:'absolute',left:20,right:20,height:38,zIndex:4,flexDirection:'row',justifyContent:'center',gap:8},tab:{minWidth:128,height:34,paddingHorizontal:13,borderRadius:4,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(40,28,20,.58)',borderWidth:1,borderColor:'rgba(238,216,180,.34)'},tabActive:{backgroundColor:'rgba(238,216,180,.90)',borderColor:'#B78A57'},tabText:{color:'#F6E8D0',fontFamily:'Georgia',fontSize:11,fontWeight:'700'},tabTextActive:{color:'#4A2B1C'},centerContent:{flex:1,justifyContent:'center',alignItems:'center',paddingHorizontal:36},feedbackText:{fontSize:14,lineHeight:20,color:'#F4E8CE',textAlign:'center',fontStyle:'italic',fontWeight:'500',textShadowColor:'rgba(0,0,0,.72)',textShadowOffset:{width:0,height:1},textShadowRadius:4},deskSurface:{...StyleSheet.absoluteFillObject,zIndex:2,overflow:'hidden'},deskObjectSlot:{position:'absolute',alignItems:'center',justifyContent:'center'},objectEmoji:{fontSize:66,textAlign:'center'},historyGrid:{position:'absolute',left:18,right:18,top:0,bottom:0,flexDirection:'row',flexWrap:'wrap',justifyContent:'center',alignContent:'flex-start',gap:18},historySlot:{width:96,minHeight:108,alignItems:'center',justifyContent:'flex-start'},historyImage:{width:68,height:68,marginBottom:5},historyEmoji:{fontSize:45,lineHeight:68,marginBottom:5},offeringName:{width:'100%',fontSize:12,lineHeight:16,fontFamily:'Georgia',fontWeight:'700',color:'#FFF8EA',textAlign:'center',textShadowColor:'rgba(0,0,0,.82)',textShadowOffset:{width:0,height:1},textShadowRadius:4},offeringSender:{width:'100%',marginTop:1,fontSize:10,lineHeight:13,fontFamily:'Georgia',color:'#E8DCC5',textAlign:'center',textShadowColor:'rgba(0,0,0,.82)',textShadowOffset:{width:0,height:1},textShadowRadius:4},offeringDate:{marginTop:1,fontSize:9,lineHeight:12,color:'#D2C1A5',fontStyle:'italic',textShadowColor:'rgba(0,0,0,.82)',textShadowOffset:{width:0,height:1},textShadowRadius:3}
});