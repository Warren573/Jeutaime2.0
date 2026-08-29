import React, { useMemo, useState } from 'react';
import { Alert, Button, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { apiFetch } from '../api/client';

const LOOKING_FOR_OPTIONS = [
  { value: 'SERIEUX', label: "L'âme sœur, rien que ça" },
  { value: 'FLIRT', label: 'Rien de trop sérieux' },
  { value: 'AMITIE', label: "Des affinités d'abord" },
  { value: 'DISCUSSION', label: "J'ai vu de la lumière" },
];
const INTERESTED_IN_OPTIONS = [
  { value: 'FEMME', label: 'Femmes' },
  { value: 'HOMME', label: 'Hommes' },
  { value: 'AUTRE', label: 'Non-binaires' },
];
const PHYSICAL_DESC_OPTIONS = [
  { value: 'filiforme', label: 'Filiforme' },
  { value: 'ras_motte', label: 'Ras des mottes' },
  { value: 'grande_gigue', label: 'Grande gigue' },
  { value: 'doux', label: 'Grande beauté intérieure' },
  { value: 'athletique', label: 'Athlétique' },
  { value: 'costaud', label: 'En formes généreuses' },
  { value: 'mignon', label: 'Dans la moyenne' },
  { value: 'mysterieux', label: 'Musclé·e' },
];
const IDENTITY_TAG_OPTIONS = ['Introverti·e','Extraverti·e','Créatif·ve','Analytique','Aventurier·ère','Romantique','Drôle','Sérieux·se','Empathique','Indépendant·e','Curieux·se','Calme'];
type Skill = { id:string; label:string; detail:string; score:number };
type Question = { text:string; options:[string,string,string]; correctAnswer:0|1|2 };
const EMPTY_QUESTION = (): Question => ({ text:'', options:['','',''], correctAnswer:0 });

function normalizeLookingFor(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const map: Record<string,string> = { relation:'SERIEUX',RELATION:'SERIEUX',serieux:'SERIEUX',SERIEUX:'SERIEUX',flirt:'FLIRT',FLIRT:'FLIRT',amitie:'AMITIE',AMITIE:'AMITIE',discussion:'DISCUSSION',DISCUSSION:'DISCUSSION' };
  return values.map(v => map[String(v)] ?? String(v)).filter(Boolean);
}
function normalizeInterestedIn(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const map: Record<string,string> = { F:'FEMME',FEMME:'FEMME',women:'FEMME',WOMEN:'FEMME',M:'HOMME',HOMME:'HOMME',men:'HOMME',MEN:'HOMME',NB:'AUTRE',AUTRE:'AUTRE',other:'AUTRE',OTHER:'AUTRE' };
  return values.map(v => map[String(v)] ?? String(v)).filter(Boolean);
}
function normalizePhysicalDesc(value: unknown): string {
  const map: Record<string,string> = { beaute_int:'doux',genereuse:'costaud',moyenne:'mignon',muscle:'mysterieux' };
  const raw = typeof value === 'string' ? value : '';
  return map[raw] ?? raw;
}

export function EditProfileScreen() {
  const router = useRouter();
  const { currentUser, hydrateFromApi } = useStore();
  const pseudo = currentUser?.pseudo ?? currentUser?.name ?? '';
  const birthDate = currentUser?.birthDate ? String(currentUser.birthDate).slice(0,10) : '';
  const [city,setCity] = useState(currentUser?.city ?? '');
  const [bio,setBio] = useState(currentUser?.bio ?? '');
  const [height,setHeight] = useState(currentUser?.height != null ? String(currentUser.height) : '');
  const [physicalDesc,setPhysicalDesc] = useState(normalizePhysicalDesc(currentUser?.physicalDesc));
  const [lookingFor,setLookingFor] = useState<string[]>(normalizeLookingFor(currentUser?.lookingFor));
  const [interestedIn,setInterestedIn] = useState<string[]>(normalizeInterestedIn(currentUser?.interestedIn));
  const [hasChildren,setHasChildren] = useState<boolean|null>(currentUser?.hasChildren ?? null);
  const [wantsChildren,setWantsChildren] = useState<boolean|null>(currentUser?.wantsChildren ?? null);
  const [identityTags,setIdentityTags] = useState<string[]>(currentUser?.identityTags ?? []);
  const [skills,setSkills] = useState<Skill[]>(Array.isArray(currentUser?.skills) ? (currentUser.skills as any[]).slice(0,3).map((s,i)=>({id:String(s?.id ?? `skill_${i}`),label:String(s?.label ?? ''),detail:String(s?.detail ?? ''),score:Number(s?.score ?? s?.level ?? 50)})) : []);
  const [questions,setQuestions] = useState<Question[]>(() => { const local=currentUser?.questions as Question[]|undefined; return Array.isArray(local)&&local.length===3 ? local : [EMPTY_QUESTION(),EMPTY_QUESTION(),EMPTY_QUESTION()]; });
  const [saving,setSaving] = useState(false);
  const questionsReady = useMemo(() => questions.every(q => q.text.trim().length >= 5 && q.options.every(o => o.trim().length > 0)), [questions]);
  const toggle = (value:string,list:string[],setter:(v:string[])=>void) => setter(list.includes(value) ? list.filter(x=>x!==value) : [...list,value]);

  const save = async () => {
    if (saving) return;
    const heightNumber = Number.parseInt(height,10);
    const validSkills = skills.filter(s=>s.label.trim()||s.detail.trim()).slice(0,3).map(s=>({...s,label:s.label.trim(),detail:s.detail.trim()}));
    try {
      setSaving(true);
      await apiFetch('/profiles/me',{method:'PATCH',body:JSON.stringify({city:city.trim(),bio:bio.trim(),physicalDesc:physicalDesc||undefined,lookingFor,interestedIn,...(heightNumber>=100&&heightNumber<=250?{height:heightNumber}:{}),...(hasChildren!==null?{hasChildren}:{}),...(wantsChildren!==null?{wantsChildren}:{}),identityTags,skills:validSkills})});
      if (questionsReady) await apiFetch('/profiles/me/questions',{method:'PUT',body:JSON.stringify({questions:questions.map(q=>({questionText:q.text.trim(),answer:q.options[q.correctAnswer].trim(),wrongAnswers:q.options.filter((_,i)=>i!==q.correctAnswer).map(o=>o.trim())}))})});
      await hydrateFromApi();
      router.back();
    } catch (err:any) { Alert.alert('Erreur',err?.message||'Impossible de sauvegarder le profil'); }
    finally { setSaving(false); }
  };

  return <ScrollView keyboardShouldPersistTaps="handled">
    <Text>Modifier mon profil</Text>
    <Text>Pseudo</Text><TextInput value={pseudo} editable={false}/>
    <Text>Date de naissance</Text><TextInput value={birthDate} editable={false}/>
    <Text>Ville</Text><TextInput value={city} onChangeText={setCity}/>
    <Text>Bio / description</Text><TextInput value={bio} onChangeText={setBio} multiline maxLength={500}/><Text>{bio.length}/500</Text>

    <Text>Ce que je cherche</Text>
    {LOOKING_FOR_OPTIONS.map(o=><Button key={o.value} title={`${lookingFor.includes(o.value)?'[x] ':'[ ] '}${o.label}`} onPress={()=>toggle(o.value,lookingFor,setLookingFor)}/>)}
    <Text>Qui aimerais-tu rencontrer ?</Text>
    {INTERESTED_IN_OPTIONS.map(o=><Button key={o.value} title={`${interestedIn.includes(o.value)?'[x] ':'[ ] '}${o.label}`} onPress={()=>toggle(o.value,interestedIn,setInterestedIn)}/>)}

    <Text>Taille</Text><TextInput value={height} onChangeText={setHeight} keyboardType="numeric" maxLength={3}/>
    <Text>Description physique</Text>
    {PHYSICAL_DESC_OPTIONS.map(o=><Button key={o.value} title={`${physicalDesc===o.value?'[x] ':'[ ] '}${o.label}`} onPress={()=>setPhysicalDesc(physicalDesc===o.value?'':o.value)}/>)}

    <Text>As-tu des enfants ?</Text>
    <Button title={`${hasChildren===true?'[x] ':'[ ] '}Oui`} onPress={()=>setHasChildren(true)}/><Button title={`${hasChildren===false?'[x] ':'[ ] '}Non`} onPress={()=>setHasChildren(false)}/><Button title={`${hasChildren===null?'[x] ':'[ ] '}Non précisé`} onPress={()=>setHasChildren(null)}/>
    <Text>Souhaites-tu avoir des enfants ?</Text>
    <Button title={`${wantsChildren===true?'[x] ':'[ ] '}Oui`} onPress={()=>setWantsChildren(true)}/><Button title={`${wantsChildren===false?'[x] ':'[ ] '}Non`} onPress={()=>setWantsChildren(false)}/><Button title={`${wantsChildren===null?'[x] ':'[ ] '}Non précisé`} onPress={()=>setWantsChildren(null)}/>

    <Text>Traits d'identité</Text>
    {IDENTITY_TAG_OPTIONS.map(tag=><Button key={tag} title={`${identityTags.includes(tag)?'[x] ':'[ ] '}${tag}`} onPress={()=>toggle(tag,identityTags,setIdentityTags)}/>)}

    <Text>Compétences / talents</Text>
    {skills.map((skill,index)=><View key={skill.id||index}><Text>Compétence {index+1}</Text><TextInput value={skill.label} onChangeText={value=>setSkills(prev=>prev.map((s,i)=>i===index?{...s,label:value}:s))} placeholder="Nom"/><TextInput value={skill.detail} onChangeText={value=>setSkills(prev=>prev.map((s,i)=>i===index?{...s,detail:value}:s))} placeholder="Détail"/><Button title="Retirer" onPress={()=>setSkills(prev=>prev.filter((_,i)=>i!==index))}/></View>)}
    {skills.length<3&&<Button title="Ajouter une compétence" onPress={()=>setSkills(prev=>[...prev,{id:`skill_${Date.now()}`,label:'',detail:'',score:50}])}/>}

    <Text>Mes 3 questions</Text>
    {questions.map((q,qi)=><View key={qi}><Text>Question {qi+1}</Text><TextInput value={q.text} onChangeText={value=>setQuestions(prev=>prev.map((x,i)=>i===qi?{...x,text:value}:x))}/>{([0,1,2] as const).map(oi=><View key={oi}><TextInput value={q.options[oi]} onChangeText={value=>setQuestions(prev=>prev.map((x,i)=>{if(i!==qi)return x;const options=[...x.options] as [string,string,string];options[oi]=value;return {...x,options};}))} placeholder={`Réponse ${oi+1}`}/><Button title={`${q.correctAnswer===oi?'[x] ':'[ ] '}Bonne réponse`} onPress={()=>setQuestions(prev=>prev.map((x,i)=>i===qi?{...x,correctAnswer:oi}:x))}/></View>)}</View>)}
    {!questionsReady&&<Text>Les 3 questions ne seront enregistrées que lorsqu'elles seront toutes complètes.</Text>}

    <Button title={saving?'Sauvegarde...':'Sauvegarder mon profil'} onPress={save} disabled={saving}/>
    {currentUser?.id&&<Button title="Voir mon profil comme les autres" onPress={()=>router.push(`/profile/${currentUser.id}`)}/>} 
    <Button title="Gérer mon avatar" onPress={()=>router.push('/avatar-builder' as never)}/>
    <Button title="Gérer mes photos" onPress={()=>router.push('/my-photos' as never)}/>
    <Button title="Retour" onPress={()=>router.back()}/>
  </ScrollView>;
}
