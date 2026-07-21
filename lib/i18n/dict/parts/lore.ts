import { definePart } from "./_part";

// Hikaye metinleri: secrets.ts (sirlar), journal.ts (gunluk sayfalari), story.ts (giris + bolum notlari)
// tr = kaynak, en = ceviri. Anahtar bicimi:
//   secret.<id>.title / secret.<id>.body   (id = Secret.id, 1..12)
//   secret.ending.title / secret.ending.1..4
//   journal.<id>.title / journal.<id>.body (id = JournalEntry.id, 0..13)
//   story.intro.title / story.intro.1..3 / story.note.1..10
export const lore = definePart({
  tr: {
    // --- Sirlar (secrets.ts) ---
    "secret.1.title": "Düğün Günü",
    "secret.1.body":
      "Onu bir haziran sabahı beyazlar içinde gördüler; yüzünde ışık, elinde taze çiçekler. O gün herkes mutluydu. Kimse bunun, salonun son mutlu günü olacağını bilmiyordu.",
    "secret.2.title": "Boş Sandalye",
    "secret.2.body":
      "Saatler geçti, mumlar eridi, davetliler fısıldaştı. Damadın sandalyesi boş kaldı. Gelin kapıya baktı, baktı, baktı — ama kapı bir daha hiç açılmadı.",
    "secret.3.title": "Bekleyiş",
    "secret.3.body":
      "Salonu terk etmedi. “Gelecek,” dedi, “söz vermişti.” Gündüzler geceye döndü, çiçekler soldu, konuklar dağıldı. O ise gelinliğiyle aynı yerde beklemeye devam etti.",
    "secret.4.title": "Okunmayan Mektuplar",
    "secret.4.body":
      "Her gün bir mektup yazdı, hiç göndermeden. “Neredesin? Üşüyorum, bu beyaz artık ağırlaşıyor.” Yüzlerce zarf birikti; hiçbiri okunmadı, hiçbiri yanıtlanmadı.",
    "secret.5.title": "Aynadaki Yabancı",
    "secret.5.body":
      "Bir gece aynaya baktığında kendini tanımadı: duvağın altında kuruyan bir yüz, öfkeyle parlayan gözler. Beklemek onu değiştirmişti; artık gelin değil, bekleyişin ta kendisiydi.",
    "secret.6.title": "Yalnız Değil",
    "secret.6.body":
      "Yalnız değildi. Koridorlarda başkaları da vardı — terk edilmiş, unutulmuş, hepsi beyazlar içinde. Aynı acı onları bir araya getirmişti; şimdi birlikte dolaşıyorlardı.",
    "secret.7.title": "Fısıltıların Kaynağı",
    "secret.7.body":
      "Koridorlarda hep aynı isim dolaşır; taşın içine sinmiş bir fısıltı, bitmeyen bir yalvarış. Gelinler onu tekrar eder durur. Bir damadın adı. Belki de… seninki.",
    "secret.8.title": "Damadın Kaçışı",
    "secret.8.body":
      "Damat ölmedi. O gece, nikâhtan saatler önce içine bir korku düştü; duvağa, yeminlere, o bakışa dayanamadı. Karanlığa daldı ve bu koridorlarda kayboldu — sözünden değil, kendinden kaçarak.",
    "secret.9.title": "Düşen Fener",
    "secret.9.body":
      "Elindeki fener bir zamanlar onundu. Kaçarken düşürdü; ışığı bir titredi, sonra karanlığa yenildi. Şimdi aynı feneri sen taşıyorsun, aynı karanlıkta. Onun bıraktığı yerden yürüyorsun.",
    "secret.10.title": "Senin Adın",
    "secret.10.body":
      "Gelin sana yaklaştığında bağırmaz. Fısıldar — ve fısıldadığı isim tanıdık gelir. Çünkü o isim senin. Bunca yıl bekledi; bir başkasını değil, seni bekledi.",
    "secret.11.title": "Çağrı",
    "secret.11.body":
      "İstediği intikam değil. Yalnızca dönüp onu görmeni, kaçmayı bırakmanı istiyor. Bu labirent bir hapishane değil; yarım kalmış bir sözün yankısı, bir çağrı: “Kal.”",
    "secret.12.title": "Gerçek Damat",
    "secret.12.body":
      "Ve gerçek iner: kaçan damat sensin. Her deneyişte o geceyi yeniden yaşıyorsun; karanlık senin suçun, gelinler senin pişmanlığın. Tek kaçış çıkıştan geçmez — durmaktan, dönmekten, kalmaktan geçer.",

    // --- Gizli son (secrets.ts) ---
    "secret.ending.title": "Gerçek",
    "secret.ending.1":
      "Parçalar birleşince perde iner: bu labirentte kaçan hep sendin. Terk eden damat, arkasına bakmadan giden.",
    "secret.ending.2":
      "Gelinler seni avlamıyor — hatırlaman için yalvarıyorlar. Her tur, o geceye atılmış bir çağrı.",
    "secret.ending.3":
      "Belki kaçış hiçbir zaman çıkıştan geçmedi. Belki tek gereken durmak, dönmek ve sonunda kalmaktı.",
    "secret.ending.4": "Fener elinde titrer. Ve karanlık, ilk kez, biraz daha az yalnızdır.",

    // --- Gunluk sayfalari (journal.ts) ---
    "journal.0.title": "İlk Uyanış",
    "journal.0.body":
      "Karanlıkta gözlerimi açtım. Nerede olduğumu, buraya nasıl geldiğimi bilmiyorum. Elimde bir fener, göğsümde adı olmayan bir korku var.",
    "journal.1.title": "Islak Bir Sayfa",
    "journal.1.body":
      "…düğün sabahıydı. Çanlar çalmıyordu; çalan yalnızca kafamın içindeki o uğultuydu. Beni buraya getiren yolu bir türlü hatırlayamıyorum.",
    "journal.2.title": "Kömürle Yazılmış",
    "journal.2.body":
      "Gelinler ağlamıyor. Ağlıyormuş gibi ses çıkarıyorlar ama gözleri kuru. Sanırım ağlamayı çoktan unuttular — tıpkı benim gibi.",
    "journal.3.title": "Yırtık Davetiye",
    "journal.3.body":
      "Adım hâlâ davetiyede yazılı. Ama yanında bir tarih yok. Sanki bu düğün hiç bitmeyecek; ben kaçtıkça o beni beklemeye devam edecek.",
    "journal.4.title": "Bir Çocuğun Çizimi",
    "journal.4.body":
      "Duvarda küçük bir el, üç mum çizmiş. Altına 'onları yakma' yazmış. Ama karanlıkta insan yakmadan durabiliyor mu gerçekten?",
    "journal.5.title": "Kilit Sesleri",
    "journal.5.body":
      "Her çıkış bir başkasına açılıyor. Kapıları saydım, sonra saymayı bıraktım. Aslında kapı yok — yalnızca daha derin bir karanlık var.",
    "journal.6.title": "Tanıdık Bir Koku",
    "journal.6.body":
      "Bu salon tanıdık kokuyor: mum isi, solmuş çiçek, bir de… tütsü. Burayı biliyorum. Ama nereden bildiğimi hatırlamak istemiyorum.",
    "journal.7.title": "Aynalardan Kaçıyorum",
    "journal.7.body":
      "Artık aynalara bakmıyorum. Baktığımda gördüğüm yüz bir yabancının değil — benim, ama daha yaşlı, daha suçlu. Bir şey saklıyor gibi.",
    "journal.8.title": "Fenerin Kabzası",
    "journal.8.body":
      "Bu fener elime fazla iyi oturuyor; sanki bana göre yapılmış. Ya da ben ona. Parmaklarım, hiç düşünmeden onun eskimiş yerlerini buluyor.",
    "journal.9.title": "O İsim",
    "journal.9.body":
      "Gelinler bir isim fısıldıyor. Dün gece fark ettim: o isme dönüp bakıyorum. Çünkü o isim benim. Bunca zaman beni çağırıyorlarmış.",
    "journal.10.title": "Neyden Kaçıyorum?",
    "journal.10.body":
      "Koşuyorum, koşuyorum — ama neyden? Her koridor beni aynı yere, o sunağa geri getiriyor. Belki kaçtığım şey dışarıda değil, içimde.",
    "journal.11.title": "Bir Yemin",
    "journal.11.body":
      "Şimdi hatırlıyorum. Bir söz vermiştim. Bir el tutmuş, 'hep burada olacağım' demiştim. Sonra o gece… ayaklarım beni karanlığa taşıdı.",
    "journal.12.title": "Son Not",
    "journal.12.body":
      "Eğer bunu okuyorsan, sen de buradasın demektir. Fenerini kıs, nefesini tut. Ve unutma: en sessiz gelin, en yakın olandır.",
    "journal.13.title": "Kal",
    "journal.13.body":
      "Belki çıkış hiçbir zaman kurtuluş değildi. Belki tek yapmam gereken durmak, arkamı dönmek ve bu kez… gitmemek. Belki o zaman fısıltılar diner.",

    // --- Giris anlatisi (story.ts) ---
    "story.intro.title": "Neden buradasın?",
    "story.intro.1": "Ayıldığında etraf kapkaranlıktı. Ne kapı, ne pencere — yalnız nemli taş ve fenerin.",
    "story.intro.2": "Uzaktan boğuk bir düğün marşı geliyor. Kanlı yüzler seni arıyor.",
    "story.intro.3": "Çıkış, ancak birini sonsuza dek susturursan açılır.",

    // --- Bolum arasi notlar (story.ts) ---
    "story.note.1": "Duvarların ardından bir ağıt yükseliyor.",
    "story.note.2": "Fenerin biraz daha zayıfladı. Karanlık yaklaşıyor.",
    "story.note.3": "Birileri adını fısıldadı. Ama kimse yoktu.",
    "story.note.4": "Taş zeminde kurumuş bir gelin buketi. Hâlâ ıslak.",
    "story.note.5": "Uzakta bir org çalıyor — çalan kimse yok.",
    "story.note.6": "Bu koridoru daha önce gördün. Ya da o seni gördü.",
    "story.note.7": "Kan izleri seni takip ediyor gibi… hayır, sen onları.",
    "story.note.8": "Bir düğün fotoğrafı. Bütün yüzler kazınmış.",
    "story.note.9": "Ne kadar derine inersen, fısıltılar o kadar çoğalıyor.",
    "story.note.10": "Gelinlerin sayısı artıyor. Ya da sen yavaşlıyorsun.",
  },
  en: {
    // --- Secrets (secrets.ts) ---
    "secret.1.title": "The Wedding Day",
    "secret.1.body":
      "They saw her one June morning, all in white — light on her face, fresh flowers in her hands. Everyone was happy that day. No one knew it was the last happy day this hall would ever have.",
    "secret.2.title": "The Empty Chair",
    "secret.2.body":
      "Hours passed, the candles burned down, the guests began to whisper. The groom's chair stayed empty. The Bride watched the door, and watched, and watched — but the door never opened again.",
    "secret.3.title": "The Waiting",
    "secret.3.body":
      "She never left the hall. “He will come,” she said. “He promised.” Days turned to night, the flowers withered, the guests drifted away. She waited in the same spot, still in her wedding dress.",
    "secret.4.title": "Unread Letters",
    "secret.4.body":
      "She wrote a letter every day and sent none. “Where are you? I am cold, and this white grows heavier.” Hundreds of envelopes piled up; not one was read, not one answered.",
    "secret.5.title": "The Stranger in the Mirror",
    "secret.5.body":
      "One night she looked in the mirror and did not know herself: a face drying out beneath the Veil, eyes bright with rage. The waiting had changed her. She was no longer a Bride — she was the waiting itself.",
    "secret.6.title": "Not Alone",
    "secret.6.body":
      "She was not alone. There were others in the corridors — abandoned, forgotten, every one of them in white. The same wound had gathered them; now they wander together.",
    "secret.7.title": "The Source of the Whispers",
    "secret.7.body":
      "One name drifts through the corridors, always the same: a whisper soaked into the stone, a plea without end. The Brides repeat it and repeat it. A groom's name. Perhaps… yours.",
    "secret.8.title": "The Groom's Flight",
    "secret.8.body":
      "The groom did not die. That night, hours before the vows, a fear took hold of him; he could not bear the Veil, the promises, that gaze. He walked into the dark and was lost in these corridors — running not from his word, but from himself.",
    "secret.9.title": "The Fallen Lantern",
    "secret.9.body":
      "The Lantern in your hand was once his. He dropped it as he ran; the flame shuddered once, then lost to the dark. Now you carry that same Lantern, in that same dark. You walk on from where he stopped.",
    "secret.10.title": "Your Name",
    "secret.10.body":
      "When the Bride comes close she does not scream. She whispers — and the name she whispers sounds familiar. Because the name is yours. All those years she waited; not for someone else. For you.",
    "secret.11.title": "The Call",
    "secret.11.body":
      "She does not want revenge. She only wants you to turn, to see her, to stop running. This Maze is not a prison; it is the echo of a promise left unfinished. A call: “Stay.”",
    "secret.12.title": "The Real Groom",
    "secret.12.body":
      "And the truth comes down: you are the groom who ran. Every attempt, you live that night again; the dark is your guilt, the Brides are your regret. The only way out is not the exit — it is stopping, turning, staying.",

    // --- Secret ending (secrets.ts) ---
    "secret.ending.title": "The Truth",
    "secret.ending.1":
      "The pieces come together and the curtain falls: in this Maze, the one running was always you. The groom who left, who never looked back.",
    "secret.ending.2":
      "The Brides are not hunting you — they are begging you to remember. Every run is a call thrown back to that night.",
    "secret.ending.3":
      "Maybe escape never lay through the exit. Maybe all it ever took was to stop, to turn, and at last to stay.",
    "secret.ending.4": "The Lantern trembles in your hand. And the dark, for the first time, is a little less alone.",

    // --- Journal pages (journal.ts) ---
    "journal.0.title": "First Waking",
    "journal.0.body":
      "I opened my eyes in the dark. I do not know where I am, or how I got here. A Lantern in my hand, and a fear with no name in my chest.",
    "journal.1.title": "A Damp Page",
    "journal.1.body":
      "…it was the morning of the wedding. The bells were not ringing; the only ringing was that hum inside my head. I cannot remember the road that brought me here.",
    "journal.2.title": "Written in Charcoal",
    "journal.2.body":
      "The Brides do not cry. They make the sounds of crying, but their eyes are dry. I think they forgot how, a long time ago — just like me.",
    "journal.3.title": "A Torn Invitation",
    "journal.3.body":
      "My name is still on the invitation. But there is no date beside it. As if this wedding will never end; the longer I run, the longer she waits.",
    "journal.4.title": "A Child's Drawing",
    "journal.4.body":
      "A small hand drew three candles on the wall. Underneath it wrote 'do not light them'. But in the dark, can anyone really keep from lighting them?",
    "journal.5.title": "The Sound of Locks",
    "journal.5.body":
      "Every way out opens onto another. I counted the doors, then stopped counting. There are no doors, really — only a deeper dark.",
    "journal.6.title": "A Familiar Smell",
    "journal.6.body":
      "This hall smells familiar: candle soot, wilted flowers, and… incense. I know this place. But I do not want to remember how I know it.",
    "journal.7.title": "I Keep Away from Mirrors",
    "journal.7.body":
      "I do not look into mirrors anymore. The face I see is not a stranger's — it is mine, but older, guiltier. As if it were hiding something.",
    "journal.8.title": "The Lantern's Grip",
    "journal.8.body":
      "This Lantern fits my hand too well; as if it were made for me. Or I for it. My fingers find its worn places without thinking.",
    "journal.9.title": "That Name",
    "journal.9.body":
      "The Brides whisper a name. Last night I noticed: I turn my head when I hear it. Because the name is mine. All this time, they were calling me.",
    "journal.10.title": "What Am I Running From?",
    "journal.10.body":
      "I run, and I run — but from what? Every corridor brings me back to the same place, to that altar. Maybe the thing I flee is not out there. It is in me.",
    "journal.11.title": "A Vow",
    "journal.11.body":
      "Now I remember. I made a promise. I held a hand and said, 'I will always be here'. Then that night… my feet carried me into the dark.",
    "journal.12.title": "The Last Note",
    "journal.12.body":
      "If you are reading this, then you are here too. Dim your Lantern, hold your breath. And remember: the quietest Bride is the closest one.",
    "journal.13.title": "Stay",
    "journal.13.body":
      "Maybe the exit was never the way out. Maybe all I have to do is stop, turn around, and this time… not leave. Maybe then the whispers go quiet.",

    // --- Intro narration (story.ts) ---
    "story.intro.title": "Why are you here?",
    "story.intro.1": "You came to in total darkness. No door, no window — only damp stone and your Lantern.",
    "story.intro.2": "A muffled wedding march drifts in from far away. Bloodied faces are looking for you.",
    "story.intro.3": "The way out opens only if you silence one of them forever.",

    // --- Between-chapter notes (story.ts) ---
    "story.note.1": "A lament rises from behind the walls.",
    "story.note.2": "Your Lantern has grown weaker. The dark is closing in.",
    "story.note.3": "Someone whispered your name. But no one was there.",
    "story.note.4": "A dried bridal bouquet on the stone floor. Still wet.",
    "story.note.5": "An organ is playing somewhere far off — with no one at the keys.",
    "story.note.6": "You have seen this corridor before. Or it has seen you.",
    "story.note.7": "The blood trail seems to be following you… no. You are following it.",
    "story.note.8": "A wedding photograph. Every face scratched out.",
    "story.note.9": "The deeper you go, the more the whispers multiply.",
    "story.note.10": "There are more Brides now. Or you are slowing down.",
  },
});
