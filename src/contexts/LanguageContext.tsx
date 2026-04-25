import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ko' | 'es' | 'fr' | 'de' | 'ja' | 'zh-CN' | 'zh-HK' | 'zh-TW' | 'it' | 'pt' | 'ru' | 'ar' | 'vi' | 'th' | 'lo' | 'km' | 'my' | 'id' | 'ms' | 'fil' | 'kk' | 'uz' | 'mn' | 'nl' | 'pl' | 'sv' | 'no' | 'da' | 'fi' | 'el' | 'tr' | 'cs' | 'hu' | 'ro';

interface TranslationStrings {
  [key: string]: {
    [lang: string]: string;
  };
}

const translations: TranslationStrings = {
  'app.title': { en: 'Simultaneous Interpreter', ko: '동시통역가', es: 'Intérprete Simultáneo', fr: 'Interprète Simultané', de: 'Simultandolmetscher', ja: '同時通訳者', 'zh-CN': '同声传译 (简体)', 'zh-HK': '同聲傳譯 (香港)', 'zh-TW': '同聲傳譯 (台灣)', it: 'Interprete Simultaneo', pt: 'Intérprete Simultâneo', ru: 'Синхронный переводчик', ar: 'مترجم فوري', vi: 'Thông dịch viên đồng thời', th: 'ล่ามแปลพร้อม', lo: 'ນາຍພາສາ', km: 'អ្នកបកប្រែ', my: 'ဘာသာပြန်သူ', id: 'Penerjemah Simultan', ms: 'Jurubahasa Serentak', fil: 'Interpreter', kk: 'Ілеспе аудармашы', uz: 'Sinxron tarjimon', mn: 'Зэрэгцээ орчуулагч', nl: 'Simultaanvertaler', pl: 'Tłumacz symultaniczny', sv: 'Simultantolk', no: 'Simultantolk', da: 'Simultantolk', fi: 'Simultaanitulkki', el: 'Διερμηνέας ταυτόχρονης διερμηνείας', tr: 'Simultane Çevirmen', cs: 'Simultánní tlumočník', hu: 'Szinkrontolmács', ro: 'Interpret simultan' },
  'app.subtitle': { en: 'Real-time simultaneous interpretation', ko: '실시간 동시통역', es: 'Interpretación simultánea en tiempo real', fr: 'Interprétation simultanée en temps réel', de: 'Simultandolmetschen in Echtzeit', ja: 'リアルタイム同時通訳', 'zh-CN': '实时同声传译', 'zh-HK': '實時同聲傳譯', 'zh-TW': '實時同聲傳譯', it: 'Interpretazione simultanea in tempo reale', pt: 'Interpretação simultânea em tempo real', ru: 'Синхронный перевод в реальном времени', ar: 'ترجمة فورية في الوقت الحقيقي', vi: 'Thông dịch đồng thời thời gian thực', th: 'การแปลพร้อมแบบเรียลไทม์', lo: 'การแปรภาษาในเวลาจริง', km: 'ការបកប្រែតាមពេលវេលាជាក់ស្តែង', my: 'အချိန်နှင့်တပြေးညီ ဘာသာပြန်ဆိုခြင်း', id: 'Interpretasi simultan waktu nyata', ms: 'Interpretasi serentak masa nyata', fil: 'Real-time na interpretasyon', kk: 'Нақты уақыттағы ілеспе аударма', uz: 'Real vaqtda sinxron tarjima', mn: 'Бодит цагийн зэрэгцээ орчуулга', nl: 'Real-time simultaanvertaling', pl: 'Symultaniczne tłumaczenie w czasie rzeczywistym', sv: 'Simultantolkning i realtid', no: 'Simultantolkning i sanntid', da: 'Simultantolkning i realtid', fi: 'Reaaliaikainen simultaanitulkkaus', el: 'Ταυτόχρονη διερμηνεία σε πραγματικό χρόνο', tr: 'Gerçek zamanlı simultane çeviri', cs: 'Simultánní tlumočení v reálném čase', hu: 'Valós idejű szinkrontolmácsolás', ro: 'Interpretare simultană în timp real' },
  'interpreter.start': { en: 'Start Interpretation', ko: '통역 시작', es: 'Iniciar Interpretación', fr: 'Démarrer l\'interprétation', de: 'Dolmetschen starten', ja: '通訳開始', 'zh-CN': '开始同传', 'zh-HK': '開始同傳', 'zh-TW': '開始同傳', it: 'Avvia Interpretazione', pt: 'Iniciar Interpretação', ru: 'Начать перевод', ar: 'بدء الترجمة', vi: 'Bắt đầu thông dịch', th: 'เริ่มการแปล', lo: 'ເລີ່ມການແປ', km: 'ចាប់ផ្តើមបកប្រែ', my: 'ဘာသာပြန်စတင်ပါ', id: 'Mulai Interpretasi', ms: 'Mula Interpretasi', fil: 'Simulan ang Interpretasyon', kk: 'Аударманы бастау', uz: 'Tarjimani boshlash', mn: 'Орчуулга эхлүүлэх', nl: 'Start Tolken', pl: 'Rozpocznij tłumaczenie', sv: 'Starta tolkning', no: 'Start tolkning', da: 'Start tolkning', fi: 'Aloita tulkkaus', el: 'Έναρξη διερμηνείας', tr: 'Çeviriyi Başlat', cs: 'Spustit tlumočení', hu: 'Tolmácsolás indítása', ro: 'Începe interpretarea' },
  'interpreter.stop': { en: 'Stop Interpretation', ko: '통역 종료', es: 'Detener Interpretación', fr: 'Arrêter l\'interprétation', de: 'Dolmetschen stoppen', ja: '通訳終了', 'zh-CN': '停止同传', 'zh-HK': '停止同傳', 'zh-TW': '停止同傳', it: 'Ferma Interpretazione', pt: 'Parar Interpretação', ru: 'Остановить перевод', ar: 'إيقاف الترجمة', vi: 'Dừng thông dịch', th: 'หยุดการแปล', lo: 'ຢຸດການແປ', km: 'បញ្ឈប់ការបកប្រែ', my: 'ဘာသာပြန်ရပ်တန့်ပါ', id: 'Hentikan Interpretasi', ms: 'Hentikan Interpretasi', fil: 'Itigil ang Interpretasyon', kk: 'Аударманы тоқтату', uz: 'Tarjimani to\'xtatish', mn: 'Орчуулга зогсоох', nl: 'Stop Tolken', pl: 'Zatrzymaj tłumaczenie', sv: 'Stoppa tolkning', no: 'Stopp tolkning', da: 'Stop tolkning', fi: 'Lopeta tulkkaus', el: 'Διακοπή διερμηνείας', tr: 'Çeviriyi Durdur', cs: 'Zastavit tlumočení', hu: 'Tolmácsolás leállítása', ro: 'Oprește interpretarea' },
  'interpreter.source': { en: 'Source Language', ko: '출발 언어', es: 'Idioma de origen', fr: 'Langue source', de: 'Quellsprache', ja: 'ソース言語', 'zh-CN': '源语言', 'zh-HK': '源語言', 'zh-TW': '源語言', it: 'Lingua di origine', pt: 'Idioma de origem', ru: 'Исходный язык', ar: 'اللغة المصدر', vi: 'Ngôn ngữ nguồn', th: 'ภาษาต้นทาง', lo: 'ພາສາຕົ້ນສະບັບ', km: 'ភាសាប្រភព', my: 'မူရင်းဘာသာစကား', id: 'Bahasa Sumber', ms: 'Bahasa Sumber', fil: 'Pinagmulang Wika', kk: 'Бастапқы тіл', uz: 'Manba tili', mn: 'Эх хэл', nl: 'Brontaal', pl: 'Język źródłowy', sv: 'Källspråk', no: 'Kildespråk', da: 'Kildesprog', fi: 'Lähdekieli', el: 'Γλώσσα πηγής', tr: 'Kaynak Dil', cs: 'Zdrojový jazyk', hu: 'Forrásnyelv', ro: 'Limba sursă' },
  'interpreter.target': { en: 'Target Language', ko: '도착 언어', es: 'Idioma de destino', fr: 'Langue cible', de: 'Zielsprache', ja: 'ターゲット言語', 'zh-CN': '目标语言', 'zh-HK': '目標語言', 'zh-TW': '目標語言', it: 'Lingua di destinazione', pt: 'Idioma de destino', ru: 'Целевой язык', ar: 'اللغة الهدف', vi: 'Ngôn ngữ đích', th: 'ภาษาปลายทาง', lo: 'ພາສາເປົ້າໝາຍ', km: 'ភាសាគោលដៅ', my: 'ပစ်မှတ်ဘာသာစကား', id: 'Bahasa Target', ms: 'Bahasa Sasaran', fil: 'Target na Wika', kk: 'Нысаналы тіл', uz: 'Maqsadli til', mn: 'Зорилтот хэл', nl: 'Doeltaal', pl: 'Język docelowy', sv: 'Målspråk', no: 'Målspråk', da: 'Målsprog', fi: 'Kohdekieli', el: 'Γλώσσα στόχος', tr: 'Hedef Dil', cs: 'Cílový jazyk', hu: 'Célnyelv', ro: 'Limba țintă' },
  'privacy.notice': { en: 'Voice data is processed in real-time and not stored.', ko: '음성 데이터는 실시간으로 처리되며 저장되지 않습니다.', es: 'Los datos de voz se procesan en tiempo real y no se almacenan.', fr: 'Les données vocales sont traitées en temps réel et ne sont pas stockées.', de: 'Sprachdaten werden in Echtzeit verarbeitet und nicht gespeichert.', ja: '音声データはリアルタイムで処理され、保存されません。', 'zh-CN': '语音数据实时处理，不进行存储。', 'zh-HK': '語音數據實時處理，不進行存儲。', 'zh-TW': '語音數據實時處理，不進行存儲。', it: 'I dati vocali vengono elaborati in tempo reale e non vengono memorizzati.', pt: 'Os dados de voz são processados em tempo real e não são armazenados.', ru: 'Голосовые данные обрабатываются в реальном времени и не сохраняются.', ar: 'تتم معالجة البيانات الصوتية في الوقت الفعلي ولا يتم تخزينها.', vi: 'Dữ liệu giọng nói được xử lý trong thời gian thực và không được lưu trữ.', th: 'ข้อมูลเสียงจะถูกประมวลผลแบบเรียลไทม์และไม่ถูกจัดเก็บ', lo: 'ຂໍ້ມູນສຽງຖືກປະມວນຜົນໃນເວລາຈິງ ແລະບໍ່ໄດ້ຖືກເກັບຮັກສາໄວ້', km: 'ទិន្នន័យសំឡេងត្រូវបានដំណើរการក្នុងពេលវេលาជាក់ស្តែង ហើយមិនត្រូវបានរក្សាទុក', my: 'အသံဒေတာကို အချိန်နှင့်တပြေးညီ လုပ်ဆောင်ပြီး သိမ်းဆည်းထားခြင်းမရှိပါ', id: 'Data suara diproses secara real-time dan tidak disimpan', ms: 'Data suara diproses dalam masa nyata dan tidak disimpan', fil: 'Ang data ng boses ay pinoproseso sa real-time at hindi iniimbak', kk: 'Дауыс деректері нақты уақытта өңделеді және сақталмайды', uz: 'Ovozli ma\'lumotlar real vaqtda qayta ishlanadi va saqlanmaydi', mn: 'Дууны өгөгдлийг бодит цаг хугацаанд боловсруулж, хадгалдаггүй', nl: 'Spraakgegevens worden in realtime verwerkt en niet opgeslagen.', pl: 'Dane głosowe są przetwarzane w czasie rzeczywistym i nie są przechowywane.', sv: 'Röstdata bearbetas i realtid och lagras inte.', no: 'Talldata behandles i sanntid og lagres ikke.', da: 'Talldata behandles i realtid og lagres ikke.', fi: 'Puhedata käsitellään reaaliajassa eikä sitä tallenneta.', el: 'Τα δεδομένα φωνής υποβάλλονται σε επεξεργασία σε πραγματικό χρόνο και δεν αποθηκεύονται.', tr: 'Ses verileri gerçek zamanlı olarak işlenir ve saklanmaz.', cs: 'Hlasová data jsou zpracovávána v reálném čase a nejsou ukládána.', hu: 'A hangadatok valós időben kerülnek feldolgozásra, és nem kerülnek tárolásra.', ro: 'Datele vocale sunt procesate în tempo real și nu sunt stocate.' },
  'auth.login': { en: 'Sign in with Google', ko: 'Google로 로그인', es: 'Iniciar sesión con Google', fr: 'Se connecter with Google', de: 'Mit Google anmelden', ja: 'Googleでログイン', 'zh-CN': '使用Google登录', 'zh-HK': '使用Google登錄', 'zh-TW': '使用Google登錄', it: 'Accedi con Google', pt: 'Entrar com Google', ru: 'Войти через Google', ar: 'تسجيل الدخول باستخدام Google', vi: 'Đăng nhập bằng Google', th: 'ลงชื่อเข้าใช้ด้วย Google', lo: 'ເຂົ້າສູ່ລະບົບດ້ວຍ Google', km: 'ចូលដោយប្រើ Google', my: 'Google ဖြင့် ဝင်ရောက်ပါ', id: 'Masuk dengan Google', ms: 'Log masuk dengan Google', fil: 'Mag-sign in gamit ang Google', kk: 'Google арқылы кіру', uz: 'Google orqali kirish', mn: 'Google-ээр нэвтрэх', nl: 'Inloggen met Google', pl: 'Zaloguj się przez Google', sv: 'Logga in med Google', no: 'Logg inn med Google', da: 'Log ind med Google', fi: 'Kirjaudu sisään Googlella', el: 'Σύνδεση με Google', tr: 'Google ile giriş yap', cs: 'Přihlásit se přes Google', hu: 'Bejelentkezés Google-lal', ro: 'Conectează-te with Google' },
  'auth.loginFailed': { en: 'Login failed. Please try again.', ko: '로그인에 실패했습니다. 다시 시도해주세요.', es: 'Error al iniciar sesión. Por favor, inténtalo de nuevo.', fr: 'Échec de la connexion. Veuillez réessayer.', de: 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.', ja: 'ログインに失敗しました。もう一度お試しください。', 'zh-CN': '登录失败。请重试。', 'zh-HK': '登錄失敗。請重試。', 'zh-TW': '登錄失敗。請重試。', it: 'Accesso fallito. Per favore riprova.', pt: 'Falha no login. Por favor, tente novamente.', ru: 'Ошибка входа. Пожалуйста, попробуйте еще раз.', ar: 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.', vi: 'Đăng nhập thất bại. Vui lòng thử lại.', th: 'การเข้าสู่ระบบล้มเหลว โปรดลองอีกครั้ง', lo: 'ການເຂົ້າສູ່ລະບົບລົ້ມເຫຼວ. ກະລຸນาລອງໃໝ່ອີກຄັ້ງ.', km: 'ការចូលបានបរាជ័យ។ សូមព្យាយាម​ម្តងទៀត។', my: 'ဝင်ရောက်မှု မအောင်မြင်ပါ။ ကျေးဇူးပြု၍ ထပ်ကြိုးစားပါ။', id: 'Login gagal. Silakan coba lagi.', ms: 'Log masuk gagal. Sila cuba lagi.', fil: 'Nabigo ang pag-login. Pakisubukang muli.', kk: 'Кіру сәтсіз аяқталды. Қайталап көріңіз.', uz: 'Kirish muvaffaqiyatsiz tugadi. Iltimos, qaytadan urinib ko\'ring.', mn: 'Нэвтрэх амжилтгүй боллоо. Дахин оролдоно уу.', nl: 'Inloggen mislukt. Probeer het opnieuw.', pl: 'Logowanie nieudane. Spróbuj ponownie.', sv: 'Inloggningen misslyckades. Vänligen försök igen.', no: 'Innlogging mislyktes. Vennligst prøv igjen.', da: 'Log ind mislykkedes. Prøv venligst igen.', fi: 'Kirjautuminen epäonnistui. Yritä uudelleen.', el: 'Η σύνδεση απέτυχε. Παρακαλώ προσπαθήστε ξανά.', tr: 'Giriş başarısız. Lütfen tekrar deneyin.', cs: 'Přihlášení se nezdařilo. Zkuste to prosím znovu.', hu: 'A bejelentkezés sikertelen. Kérjük, próbálja újra.', ro: 'Autentificare eșuată. Vă rugăm să încercați din nou.' },
  'dash.settings': { en: 'Settings', ko: '설정', es: 'Configuración', fr: 'Paramètres', de: 'Einstellungen', ja: '設定', 'zh-CN': '设置', 'zh-HK': '設定', 'zh-TW': '設定', it: 'Impostazioni', pt: 'Configurações', ru: 'Настройки', ar: 'الإعدادات', vi: 'Cài đặt', th: 'การตั้งค่า', lo: 'ການຕັ້ງຄ່າ', km: 'การกำหนด', my: 'ဆက်တင်များ', id: 'Pengaturan', ms: 'Tetapan', fil: 'Mga Setting', kk: 'Параметрлер', uz: 'Sozlamalar', mn: 'Тохиргоо', nl: 'Instellingen', pl: 'Ustawienia', sv: 'Inställningar', no: 'Innstillinger', da: 'Indstillinger', fi: 'Asetukset', el: 'Ρυθμίσεις', tr: 'Ayarlar', cs: 'Nastavení', hu: 'Beállítások', ro: 'Setări' },
  'dash.uiLanguage': { en: 'UI Language', ko: 'UI 언어', es: 'Idioma de la interfaz', fr: 'Langue de l\'interface', de: 'UI-Sprache', ja: 'UI言語', 'zh-CN': '界面语言', 'zh-HK': '界面語言', 'zh-TW': '界面語言', it: 'Lingua dell\'interfaccia', pt: 'Idioma da interface', ru: 'Язык интерфейса', ar: 'لغة الواجهة', vi: 'Ngôn ngữ giao diện', th: 'ภาษาของอินเทอร์เฟซ', lo: 'ພາສາອິນເຕີເຟດ', km: 'ភាសានៃចំណុចប្រទាក់', my: 'အင်တာဖေ့စ်ဘာသာစကား', id: 'Bahasa antarmuka', ms: 'Bahasa antara muka', fil: 'Wika ng interface', kk: 'Интерфейс тілі', uz: 'Interfeys tili', mn: 'Интерфейсийн хэл', nl: 'Interface-taal', pl: 'Język interfejsu', sv: 'Gränssnittsspråk', no: 'Grensesnittsspråk', da: 'Grænsefladesprog', fi: 'Käyttöliittymän kieli', el: 'Γλώσσα διεπαφής', tr: 'Arayüz Dili', cs: 'Jazyk rozhraní', hu: 'Felület nyelve', ro: 'Limba interfeței' },
  'dash.essentialExpressions': { en: 'Essential Expressions', ko: '필수 표현', es: 'Expresiones esenciales', fr: 'Expressions essentielles', de: 'Wichtige Ausdrücke', ja: '必須表現', 'zh-CN': '基本表达', 'zh-HK': '基本表達', 'zh-TW': '基本表達', it: 'Espressioni essenziali', pt: 'Expressões essenciais', ru: 'Основные выражения', ar: 'تعبيرات أساسية', vi: 'Các biểu thức thiết yếu', th: 'สำนวนที่จำเป็น', lo: 'ສຳນວນທີ່ຈຳເປັນ', km: 'កន្សោមសំខាន់ៗ', my: 'မရှိมဖြစ်လိုအပ်သော အသုံးအနှုန်းများ', id: 'Ekspresi penting', ms: 'Ungkapan penting', fil: 'Mahahalagang Ekspresyon', kk: 'Маңызды өрнектер', uz: 'Muhim iboralar', mn: 'Чухал илэрхийллүүд', nl: 'Essentiële uitdrukkingen', pl: 'Niezbędne wyrażenia', sv: 'Viktiga uttryck', no: 'Viktige uttrykk', da: 'Vigtige udtryk', fi: 'Tärkeät ilmaisut', el: 'Βασικές εκφράσεις', tr: 'Temel İfadeler', cs: 'Základní výrazy', hu: 'Alapvető kifejezések', ro: 'Expresii esențiale' },
  'dash.essentialExpressionsDesc': { en: 'Learn basic phrases for daily conversation.', ko: '일상 대화에 필요한 기본 문구를 학습하세요.', es: 'Aprende frases básicas para la conversación diaria.', fr: 'Apprenez des phrases de base pour la conversation quotidienne.', de: 'Lernen Sie grundlegende Sätze für die tägliche Konversation.', ja: '日常会話に必要な基本的なフレーズを学びましょう。', 'zh-CN': '学习日常对话的基本短语。', 'zh-HK': '學習日常對話的基本短語。', 'zh-TW': '學習日常對話的基本短語。', it: 'Impara frasi di base per la conversazione quotidiana.', pt: 'Aprenda frases básicas para a conversa diária.', ru: 'Изучайте базовые фразы для повседневного общения.', ar: 'تعلم عبارات أساسية للمحادثة اليومية.', vi: 'Học các cụm từ cơ bản cho cuộc trò chuyện hàng ngày.', th: 'เรียนรู้วลีพื้นฐานสำหรับการสนทนาในชีวิตประจำวัน', lo: 'ຮຽນຮູ້ວະລີພື້ນຖານສໍາລັບการສົນทະนาປະຈໍາວັນ', km: 'រៀនឃ្លาជាមូលដ្ឋានសម្រាប់ការសន្ទនាប្រចាំថ្ងៃ', my: 'နေ့စဉ်စကားပြောဆိုမှုအတွက် အခြေခံအသုံးအနှုန်းများကို လေ့လာပါ။', id: 'Pelajari frasa dasar untuk percakapan sehari-hari.', ms: 'Pelajari frasa asas untuk perbualan harian.', fil: 'Matuto ng mga pangunahing parirala para sa pang-araw-araw na pag-uusap.', kk: 'Күнделікті сөйлесуге арналған негізгі фразаларды үйреніңіз.', uz: 'Kundalik suhbat uchun asosiy iboralarni o\'rganing.', mn: 'Өдөр тутмын ярианд хэрэглэх үндсэн хэллэгүүдийг сур.', nl: 'Leer basiszinnen voor dagelijkse gesprekken.', pl: 'Ucz się podstawowych zwrotów do codziennej rozmowy.', sv: 'Lär dig grundläggande fraser för daglig konversation.', no: 'Lær grunnleggende fraser for daglig samtale.', da: 'Lær grundlæggende sætninger til daglig samtale.', fi: 'Opi peruslauseita päivittäistä keskustelua varten.', el: 'Μάθετε βασικές φράσεις για την καθημερινή συζήτηση.', tr: 'Günlük konuşma için temel ifadeleri öğrenin.', cs: 'Naučte se základní fráze pro každodenní konverzaci.', hu: 'Tanuljon alapvető kifejezéseket a mindennapi beszélgetéshez.', ro: 'Învață fraze de bază pentru conversația zilnică.' },
  'dash.recentConversations': { en: 'Recent Conversations', ko: '최근 대화', es: 'Conversaciones recientes', fr: 'Conversations récentes', de: 'Kürzliche Konversationen', ja: '最近の会話', 'zh-CN': '最近的对话', 'zh-HK': '最近的對話', 'zh-TW': '最近的對話', it: 'Conversazioni recenti', pt: 'Conversas recentes', ru: 'Недавние разговоры', ar: 'المحادثات الأخيرة', vi: 'Các cuộc hội thoại gần đây', th: 'การสนทนาล่าสุด', lo: 'ການສົນທະນາທີ່ຜ່ານມາ', km: 'การសន្ទนาថ្មីៗ', my: 'မကြာသေးမီက ပြောဆိုမှုများ', id: 'Percakapan terbaru', ms: 'Perbualan terkini', fil: 'Mga kamakailang pag-uusap', kk: 'Соңғы әңгімелер', uz: 'Yaqingi suhbatlar', mn: 'Сүүлийн ярианууд', nl: 'Recente gesprekken', pl: 'Ostatnie rozmowy', sv: 'Senaste konversationer', no: 'Nylige samtaler', da: 'Seneste samtaler', fi: 'Viimeisimmät keskustelut', el: 'Πρόσφατες συνομιλίες', tr: 'Son Konuşmalar', cs: 'Nedávné konverzace', hu: 'Legutóbbi beszélgetések', ro: 'Conversații recente' },
  'dash.goToLearning': { en: 'Go to Learning Dashboard', ko: '학습 대시보드로 이동', es: 'Ir al panel de aprendizaje', fr: 'Aller au tableau de bord d\'apprentissage', de: 'Zum Lern-Dashboard', ja: '学習ダッシュボードへ', 'zh-CN': '前往学习仪表板', 'zh-HK': '前往學習儀表板', 'zh-TW': '前往學習儀表板', it: 'Vai al dashboard di apprendimento', pt: 'Ir para o painel de aprendizado', ru: 'Перейти к панели обучения', ar: 'اذهب إلى لوحة تعلم', vi: 'Đi đến bảng điều khiển học tập', th: 'ไปที่แดชบอร์ดการเรียนรู้', lo: 'ໄປທີ່ແຜງຄວບຄຸມການຮຽນຮູ້', km: 'ទៅកាន់ផ្ទាំងគ្រប់គ្រងការរៀនសូត្រ', my: 'သင်ယူမှုဒက်ရှ်ဘုတ်သို့သွားပါ', id: 'Pergi ke dasbor pembelajaran', ms: 'Pergi ke papan pemuka pembelajaran', fil: 'Pumunta sa dashboard ng pag-aaral', kk: 'Оқу бақылау тақтасына өту', uz: 'O\'quv boshqaruv paneliga o\'tish', mn: 'Сургалтын хяналтын самбар руу очих', nl: 'Ga naar het leer-dashboard', pl: 'Przejdź do pulpitu nawigacyjnego nauki', sv: 'Gå till lärande-dashboard', no: 'Gå til lærings-dashbord', da: 'Gå til lærings-dashboard', fi: 'Siirry oppimisen hallintapaneeliin', el: 'Μετάβαση στον πίνακα ελέγχου εκμάθησης', tr: 'Öğrenme Panosuna Git', cs: 'Přejít na výukový panel', hu: 'Ugrás a tanulási irányítópultra', ro: 'Mergi la tabloul de bord de învățare' },
  'dash.noConversations': { en: 'No conversations yet.', ko: '아직 대화 기록이 없습니다.', es: 'Aún no hay conversaciones.', fr: 'Aucune conversation pour le moment.', de: 'Noch keine Konversationen.', ja: 'まだ会話はありません。', 'zh-CN': '暂无对话。', 'zh-HK': '暫無對話。', 'zh-TW': '暫無對話。', it: 'Nessuna conversazione ancora.', pt: 'Ainda não há conversas.', ru: 'Разговоров пока нет.', ar: 'لا توجد محادثات حتى الآن.', vi: 'Chưa có cuộc hội thoại nào.', th: 'ยังไม่มีการสนทนา', lo: 'ຍັງບໍ່ມີການສົນทະນາເທື່ອ', km: 'មិនទាន់មានការសន្ទនាទេ', my: 'စကားပြောဆိုမှုများ မရှိသေးပါ', id: 'Belum ada percakapan.', ms: 'Belum ada perbualan.', fil: 'Wala pang mga pag-uusap.', kk: 'Әзірге әңгімелер жоқ.', uz: 'Hali suhbatlar yo\'q.', mn: 'Яриа хараахан алга.', nl: 'Nog geen gesprekken.', pl: 'Brak rozmów.', sv: 'Inga konversationer än.', no: 'Ingen samtaler ennå.', da: 'Ingen samtaler endnu.', fi: 'Ei keskusteluja vielä.', el: 'Δεν υπάρχουν ακόμη συνομιλίες.', tr: 'Henüz konuşma yok.', cs: 'Zatím žádné konverzace.', hu: 'Még nincsenek beszélgetések.', ro: 'Nicio conversație încă.' },
  'review.word': { en: 'Word/Expression', ko: '단어/표현', es: 'Palabra/Expresión', ja: '単語/表現' },
  'review.meaning': { en: 'Meaning', ko: '의미', es: 'Significado', ja: '意味' },
  'review.again': { en: 'Again', ko: '다시', es: 'Otra vez', ja: 'もう一度' },
  'review.hard': { en: 'Hard', ko: '어려움', es: 'Difícil', ja: '難しい' },
  'review.good': { en: 'Good', ko: '괜찮음', es: 'Bien', ja: '普通' },
  'review.easy': { en: 'Easy', ko: '쉬움', es: 'Fácil', ja: '簡単' },
  'review.showAnswer': { en: 'Show Answer', ko: '정답 보기', es: 'Mostrar respuesta', ja: '答えを表示' },
  'review.complete': { en: 'Review Complete!', ko: '복습 완료!', es: '¡Repaso completo!', ja: '復習完了！' },
  'dash.noReview': { en: 'No items due for review.', ko: '복습할 항목이 없습니다.', es: 'No hay elementos para repasar.', ja: '復習する項目はありません。' },
  'dash.readyDesc': { en: 'Ready to learn.', ko: '학습 준비 완료.', es: 'Listo para aprender.', ja: '学習の準備ができました。' },
  'dash.reviewTitle': { en: 'Review', ko: '복습', es: 'Repaso', ja: '復習' },
  'tutor.connecting': { en: 'Connecting to AI Tutor...', ko: 'AI 튜터와 연결 중...', es: 'Conectando con el tutor de IA...', ja: 'AIチューターに接続中...' },
  'tutor.error': { en: 'Connection error. Please try again.', ko: '연결 오류가 발생했습니다. 다시 시도해주세요.', es: 'Error de conexión. Por favor, inténtalo de nuevo.', ja: '接続エラーが発生했습니다。もう一度お試しください' },
  'tutor.aiTutor': { en: 'AI Tutor', ko: 'AI 튜터', es: 'Tutor de IA', ja: 'AIチューター' },
  'tutor.listening': { en: 'Listening...', ko: '듣고 있습니다...', es: 'Escuchando...', ja: '聴いています...' },
  'tutor.ready': { en: 'Ready to Talk', ko: '대화 준비 완료', es: 'Listo para hablar', ja: '会話の準備完了' },
  'tutor.descRec': { en: 'I am listening. Speak naturally.', ko: '듣고 있습니다. 자연스럽게 말씀하세요.', es: 'Estoy escuchando. Habla con naturalidad.', ja: '聴いています。自然に話してください。' },
  'tutor.descWait': { en: 'Tap the mic to start the lesson.', ko: '마이크를 눌러 레슨을 시작하세요.', es: 'Toca el micrófono para comenzar la lección.', ja: 'マイクをタップしてレッスンを開始します。' },
  'dash.history': { en: 'History', ko: '기록', es: 'Historial', ja: '履歴' },
  'dash.materials': { en: 'Materials', ko: '학습 자료', es: 'Materiales', ja: '教材' },
  'dash.stats': { en: 'Stats', ko: '통계', es: 'Estadísticas', ja: '統計' },
};

export const languageNames: Record<Language, string> = {
  en: 'English', ko: '한국어', es: 'Español', fr: 'Français', de: 'Deutsch',
  ja: '日本語', 'zh-CN': '简体中文', 'zh-HK': '繁體中文 (香港)', 'zh-TW': '繁體中文 (台灣)',
  it: 'Italiano', pt: 'Português', ru: 'Русский', ar: 'العربية', vi: 'Tiếng Việt',
  th: 'ไทย', lo: 'ລາວ', km: 'ខ្មែរ', my: 'မြန်မာ', id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu', fil: 'Filipino', kk: 'Қазақша', uz: 'Oʻzbekcha',
  mn: 'Монгол', nl: 'Nederlands', pl: 'Polski', sv: 'Svenska', no: 'Norsk',
  da: 'Dansk', fi: 'Suomi', el: 'Ελληνικά', tr: 'Türkçe', cs: 'Čeština',
  hu: 'Magyar', ro: 'Română'
};

interface LanguageContextType {
  sourceLanguage: Language;
  setSourceLanguage: (lang: Language) => void;
  targetLanguage: Language;
  setTargetLanguage: (lang: Language) => void;
  uiLanguage: Language;
  setUiLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sourceLanguage, setSourceLanguage] = useState<Language>(() => {
    return (localStorage.getItem('sourceLanguage') as Language) || 'ko';
  });
  const [targetLanguage, setTargetLanguage] = useState<Language>(() => {
    return (localStorage.getItem('targetLanguage') as Language) || 'th';
  });
  const [uiLanguage, setUiLanguage] = useState<Language>(() => {
    return (localStorage.getItem('uiLanguage') as Language) || 'ko';
  });

  useEffect(() => {
    localStorage.setItem('sourceLanguage', sourceLanguage);
  }, [sourceLanguage]);

  useEffect(() => {
    localStorage.setItem('targetLanguage', targetLanguage);
  }, [targetLanguage]);

  useEffect(() => {
    localStorage.setItem('uiLanguage', uiLanguage);
  }, [uiLanguage]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) return key;
    return translation[uiLanguage] || translation['en'] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        sourceLanguage,
        setSourceLanguage,
        targetLanguage,
        setTargetLanguage,
        uiLanguage,
        setUiLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
