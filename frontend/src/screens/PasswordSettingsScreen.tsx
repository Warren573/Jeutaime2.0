import React, { useState } from 'react';
import { Alert, Button, ScrollView, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { changePassword } from '../api/accountSecurity';
import { useStore } from '../store/useStore';

export default function PasswordSettingsScreen() {
  const router = useRouter(); const logout = useStore((s) => s.logout);
  const [currentPassword,setCurrentPassword]=useState(''); const [newPassword,setNewPassword]=useState(''); const [confirmPassword,setConfirmPassword]=useState(''); const [saving,setSaving]=useState(false);
  const validNewPassword=newPassword.length>=8&&newPassword.length<=72&&/[a-z]/.test(newPassword)&&/[A-Z]/.test(newPassword)&&/\d/.test(newPassword);
  const canSubmit=currentPassword.length>0&&validNewPassword&&newPassword===confirmPassword&&!saving;
  const submit=async()=>{ if(!canSubmit)return; try{setSaving(true);await changePassword({currentPassword,newPassword});Alert.alert('Mot de passe modifié','Tes autres sessions ont été déconnectées. Reconnecte-toi avec ton nouveau mot de passe.',[{text:'Se reconnecter',onPress:()=>{void logout().catch(()=>{});router.replace('/login');}}]);}catch(err){Alert.alert('Erreur',err instanceof Error?err.message:'Modification impossible.');}finally{setSaving(false);} };
  return <ScrollView><Text>Mot de passe</Text><Text>Mot de passe actuel</Text><TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" autoCorrect={false}/><Text>Nouveau mot de passe</Text><TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" autoCorrect={false}/><Text>Confirmer le nouveau mot de passe</Text><TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" autoCorrect={false}/><Text>8 caractères minimum, une majuscule, une minuscule et un chiffre.</Text>{confirmPassword.length>0&&newPassword!==confirmPassword?<Text>Les deux nouveaux mots de passe ne correspondent pas.</Text>:null}<Button title={saving?'Modification...':'Modifier le mot de passe'} onPress={()=>void submit()} disabled={!canSubmit}/><Button title="Retour" onPress={()=>router.back()}/></ScrollView>;
}
