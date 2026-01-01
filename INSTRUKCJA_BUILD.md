# Instrukcja generowania aplikacji (Android & iOS)

**Repozytorium:** [Feel-alignment-v3](https://github.com/Nowidas/Feel-alignment-v3)

## 1. Android (Plik .apk)
Możesz to zrobić na Windowsie lub Macu. Nie potrzebujesz płatnego konta Google.

1.  Otwórz terminal w folderze projektu.
2.  Upewnij się, że jesteś zalogowany do EAS:
    ```bash
    eas login
    ```
3.  Zapisz zmiany w gicie (zalecane):
    ```bash
    git add .
    git commit -m "Wersja gotowa do budowania"
    ```
4.  Uruchom budowanie w chmurze:
    ```bash
    eas build --platform android --profile preview
    ```
5.  Gdy proces się zakończy, otrzymasz link do pobrania pliku `.apk`.
6.  Pobierz plik na telefon i zainstaluj go.

### Aktualizacja aplikacji (Android)
Jeśli wprowadzisz zmiany w kodzie i chcesz wygenerować nową wersję:
1.  (Opcjonalnie) Zmień numer wersji w `app.json` (np. `version: "1.0.1"`), aby wiedzieć, że to nowa wersja.
2.  Zapisz zmiany:
    ```bash
    git add .
    git commit -m "Aktualizacja wersji"
    ```
3.  Uruchom ponownie tę samą komendę:
    ```bash
    eas build --platform android --profile preview
    ```
4.  Pobierz i zainstaluj nowy plik `.apk` (nadpisze starą wersję na telefonie).

---

## 2. iOS (Wymagany Mac + Darmowe Apple ID)
Ponieważ nie masz płatnego konta Apple Developer ($99), musisz użyć Maca i kabla USB.

### Krok A: Przygotowanie środowiska (na Macu)
1.  Pobierz i zainstaluj **Xcode** z Mac App Store.
2.  Zainstaluj **Node.js** (ze strony nodejs.org).
3.  Skopiuj folder z projektem na Maca.
4.  W terminalu w folderze projektu wpisz:
    ```bash
    npm install
    ```

### Krok B: Generowanie projektu natywnego
W terminalu wpisz:
```bash
npx expo prebuild --platform ios
```
To utworzy folder `ios` w Twoim projekcie.

### Krok C: Konfiguracja w Xcode
1.  Otwórz projekt w Xcode:
    ```bash
    xed ios
    ```
    (lub otwórz plik `ios/apptest2.xcworkspace` ręcznie).
2.  W Xcode kliknij na główny projekt (niebieska ikona po lewej na górze).
3.  Wybierz **target** (nie projekt!) - zwykle nazywa się tak samo jak projekt.
4.  Wybierz zakładkę **Signing & Capabilities**.
5.  Kliknij **Add Account** i zaloguj się swoim darmowym Apple ID.
6.  W polu **Team** wybierz swoje imię/nazwisko (Personal Team).
7.  Jeśli pojawi się błąd o "Bundle Identifier", zmień go na unikalny (np. dopisz cyfry na końcu).

#### Rozwiązywanie problemu z Push Notifications
Jeśli pojawi się błąd: *"Cannot create provisioning profile... does not support Push Notification capability"*:
1.  W zakładce **Signing & Capabilities** znajdź sekcję **Push Notifications**.
2.  Kliknij przycisk **–** (minus) obok tej sekcji, aby ją usunąć.
3.  Xcode powinien teraz automatycznie utworzyć provisioning profile.

> **Uwaga:** Lokalne powiadomienia (przypomnienia) nadal będą działać. Tylko zdalne push notifications z serwera nie będą działać, ale aplikacja ich nie używa.

### Krok D: Tworzenie bundle JavaScript
**Ten krok jest wymagany!** Bez niego aplikacja wyświetli błąd "No script URL provided".

W terminalu (w folderze projektu na Macu) wpisz:
```bash
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle --assets-dest ios
```

Następnie w Xcode:
1.  W lewym panelu kliknij prawym przyciskiem na folder projektu.
2.  Wybierz **Add Files to "apptest2"**.
3.  Znajdź i dodaj plik `ios/main.jsbundle` (jeśli nie został dodany automatycznie).

### Krok E: Instalacja na iPhonie
1.  Podłącz iPhone'a kablem do Maca.
2.  W Xcode na górnym pasku wybierz swój telefon z listy urządzeń (zamiast symulatora).
3.  Kliknij przycisk **Play** (trójkąt) w lewym górnym rogu.
4.  Gdy Xcode poprosi o **hasło do pęku kluczy** - wpisz hasło logowania do Maca.
5.  Poczekaj, aż aplikacja się zbuduje i zainstaluje.

### Krok F: Uruchomienie
1.  Na iPhonie wejdź w **Ustawienia -> Ogólne -> VPN i zarządzanie urządzeniami**.
2.  Kliknij w swój email (Developer App).
3.  Wybierz **Zaufaj** (Trust).
4.  Teraz możesz uruchomić aplikację!

> **Ważne:** Na darmowym koncie aplikacja wygasa co **7 dni**. Po tym czasie musisz ponownie podłączyć telefon do Maca i kliknąć "Play" w Xcode, aby ją odświeżyć.

---

## 3. Aktualizacja aplikacji iOS
Jeśli wprowadzisz zmiany w kodzie i chcesz zaktualizować aplikację na iPhonie:

1.  Skopiuj zaktualizowany kod na Maca.
2.  W terminalu (w folderze projektu):
    ```bash
    npm install
    npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle --assets-dest ios
    ```
3.  Otwórz Xcode, podłącz telefon i kliknij **Play**.

---

## Rozwiązywanie problemów

### Błąd: "No script URL provided"
Oznacza brak bundle JavaScript. Wykonaj krok D (tworzenie bundle).

### Błąd: "Cannot create provisioning profile... Push Notification"
Usuń capability Push Notifications w Xcode (patrz krok C).

### Aplikacja się nie uruchamia po 7 dniach
Podłącz telefon do Maca i kliknij Play w Xcode - to odnowi certyfikat.
