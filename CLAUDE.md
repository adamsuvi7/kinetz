# FITSYNC — Hybrid Fitness, Strava GPS, AI Nutrition & Analytics App

## 1. Project Overview & Reference File
- **Acuan Utama**: Baca file `prototype-reference.html` (atau `index.html`) di repositori ini. Seluruh state, perhitungan, komponen UI, dan canvas rendering di dalam file tersebut sudah berjalan tanpa bug dan wajib dipertahankan saat dimodularisasi.
- **Konsep Produk**: Aplikasi All-in-One yang menggabungkan pelacak latihan beban Gym (Strength Volume & Anatomi Otot), pelacak GPS Kardio & Multi-Sport ala Strava, manajemen diet (TDEE, Protein, Timer Puasa IF/OMAD, AI Food Vision), analitik ukuran tubuh (Antropometri), dan Studio Social Share ukuran Instagram Story 9:16.

## 2. Design System (Dual-Theme Engine)
Pertahankan sistem dua tema yang dapat diganti secara instan:
1. **Obsidian Cyber-Lime (Dark Mode - Default)**:
   - Background utama: `#0E110F`, Card: `#161B18`, Card Alt: `#1D2420`
   - Aksen utama: `#C8F526` (Cyber-Lime), Teks utama: `#F3F7F4`, Muted: `#8E9B93`
   - Komponen khas: Semi-circle dial gauge untuk jadwal latihan & countdown puasa IF/OMAD, anatomi otot SVG interaktif yang menyala sesuai split latihan, grafik Weekly Consistency dengan slotted bar vertikal (`|||`), kurva Body Analytics, dan kartu BMI/Body Fat.
2. **Fresh Sage & Lime (Light Mode)**:
   - Background utama: `#F2F7F1`, Card: `#FFFFFF`, Card Alt: `#EAF3E8`
   - Kartu Hero "Your Progress" dengan gradasi hijau sage (`#438257` ke `#83BD7E`) dan 6 lingkaran progres harian (`✓, ✓, 16, 17, 18, 19`), 3 pill statistik (Calories, Steps, Heartbeat), serta kalender bulanan dengan ringkasan Workout Summary.
3. **Typography**:
   - Heading / Angka Metrik: `'Space Grotesk', sans-serif`
   - Body / UI: `'Plus Jakarta Sans', sans-serif`

## 3. Core Modules (5 Pilar Blueprint + Ekspansi ATM Strava)
1. **Biometrik, Jadwal Mingguan & Puasa (IF/OMAD)**:
   - Kalkulator BMR & TDEE menggunakan rumus **Mifflin-St Jeor**:
     `BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5` (Pria)
   - Target Protein harian (`1.8g - 2.2g x BB kg`) dan protokol puasa interaktif (`IF 16:8`, `18:6`, `20:4`, `OMAD 23:1`) dengan live countdown timer.
2. **Hybrid Workout Logger (Gym + Strava Run + Multi-Sport)**:
   - **Mode Gym**: Pemilihan split (`Push`, `Pull`, `Legs`, `Upper`, `Lower`, `FullBody`), log Set/Beban(kg)/Reps, kalkulasi otomatis Total Volume (`Σ Set * Reps * Weight`), deteksi Personal Record (`PR 🔥`), dan estimasi **1-Rep Max (Epley Formula)**: `1RM = Weight * (1 + Reps / 30)` beserta rasio kekuatan terhadap berat badan (`1RM / BW`).
   - **Mode Lari (Strava GPS Engine)**: Live timer, perhitungan otomatis Avg Pace (`/km`), Moving Time, Cadence (`spm`), Heart Rate (`bpm`), visualisasi rute GPS dengan penanda kilometer (`START`, `1K`..`5K`) & profil elevasi 3D, tabel Splits per KM, serta **Race Predictor (5K, 10K, Half Marathon, Full Marathon)** dengan **Riegel Formula**: `T2 = T1 * (D2 / D1)^1.06`.
   - **Mode Multi-Sport & Burn Target Router**: Mendukung Sepeda, Padel/Tenis, Hiking, Renang, Basket/Futsal, dan Jalan Cepat berbasis METs (`Kalori = MET * BB_kg * Durasi_jam`), ditambah perencana jarak rute otomatis berdasarkan target kalori yang ingin dibakar.
   - **Segmen KOM/QOM & Local Legend**: Leaderboard waktu tercepat di segmen rute, frekuensi 90 hari (Local Legend), dan leaderboard rasio kekuatan Gym (Iron Legend).
3. **AI Vision Food Scanner & Kalender Nutrisi**:
   - Integrasi kamera/upload foto makanan ke AI Vision API (Gemini Flash/Pro Vision) untuk mendeteksi item makanan, total kalori, protein, karbohidrat, dan lemak.
   - Dilengkapi slider koreksi porsi gramasi (`50%` s/d `200%`) sebelum disimpan ke log harian.
4. **Dashboard Analitik & Antropometri (Ukuran Tubuh)**:
   - Pencatatan dan kurva tren untuk 5 metrik ukuran tubuh: **Berat Badan (kg), Lingkar Pinggang (cm), Lingkar Paha (cm), Lingkar Lengan (cm), dan Lingkar Dada (cm)**.
   - Grafik **Fitness, Freshness & Nutritional Recovery** yang menggabungkan beban latihan dengan persentase pencapaian protein harian.
5. **IG Story 9:16 Studio (`1080x1920`) & Live WebRTC Camera**:
   - Resolusi kanvas eksak `1080x1920` (9:16 IG Story) dan `1080x1350` (4:5 IG Feed) dengan algoritma `drawImageCover` (center-crop anti-gepeng).
   - **Aturan Tata Letak Presisi**: Blok metrik 2x2 di bagian bawah (`TOTAL VOLUME`, `COMPLETED SETS`, `PERSONAL RECORDS`, `ACTIVE CALORIES` atau metrik Lari/Diet) ditempatkan di **Lower Safe-Zone** (`Y ≈ 1395` pada kanvas `1920px`) dengan ruang tengah yang lega, garis pembagi simetris, dan slider pengatur posisi vertikal HUD secara real-time.
   - Mendukung Mode Stiker Transparan (PNG), WebRTC In-App Camera (putar kamera depan/belakang + mirror selfie gym), dan Web Share API.
   - Fitur tambahan Strava ATM: **AI Athlete Intelligence**, **Monthly Challenges Trophy**, **FitSync Club Feed (Kudos 👍 & PR Bump 🔥)**, dan **SafeLink Bio-Beacon** ke WhatsApp.