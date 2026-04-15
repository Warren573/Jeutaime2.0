const handleRegister = async () => {
  if (!isFormValid || isLoading) return;

  try {
    setIsLoading(true);

    const birthDateIso = new Date(
      `${birthDate.trim()}T00:00:00.000Z`
    ).toISOString();

    const res = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        pseudo: pseudo.trim(),
        email: email.trim().toLowerCase(),
        birthDate: birthDateIso,
        city: city.trim(),
        gender,
        password,
      }),
    });

    const token = res?.accessToken || res?.token;

    if (!token) {
      Alert.alert(
        "Compte créé",
        "Le compte a bien été créé. Connecte-toi maintenant."
      );
      router.replace("/login");
      return;
    }

    await saveToken(token);
    router.replace("/create-profile");
  } catch (err: any) {
    Alert.alert("Erreur", err?.message || "Impossible de créer le compte.");
  } finally {
    setIsLoading(false);
  }
};