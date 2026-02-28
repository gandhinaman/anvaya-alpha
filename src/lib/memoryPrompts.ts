// 100+ unique memory prompts — English & Hindi pairs
// Organized by theme. No duplicates.

export interface PromptPair {
  en: string;
  hi: string;
}

export const MEMORY_PROMPTS: PromptPair[] = [
  // ─── CHILDHOOD ────────────────────────────────────────────
  { en: "What's your happiest childhood memory?", hi: "आपकी सबसे खुशी की बचपन की याद क्या है?" },
  { en: "What games did you play as a child?", hi: "बचपन में कौन से खेल खेलते थे?" },
  { en: "Who was your best friend growing up?", hi: "बड़े होते हुए आपका सबसे करीबी दोस्त कौन था?" },
  { en: "What was your school like?", hi: "बचपन में आपका स्कूल कैसा था?" },
  { en: "What mischief did you get into as a kid?", hi: "बचपन में कौन सी शरारतें करते थे?" },
  { en: "Did you have a nickname? How did you get it?", hi: "क्या आपका कोई उपनाम था? वो कैसे पड़ा?" },
  { en: "What was your favorite toy or plaything?", hi: "आपका पसंदीदा खिलौना क्या था?" },
  { en: "Tell us about a summer vacation you loved.", hi: "गर्मी की छुट्टियों की कोई प्यारी याद बताइए।" },
  { en: "What was bedtime like in your childhood home?", hi: "बचपन में सोने से पहले कैसा माहौल होता था?" },
  { en: "What's the earliest memory you can recall?", hi: "आपकी सबसे पुरानी याद कौन सी है?" },

  // ─── FAMILY ───────────────────────────────────────────────
  { en: "Tell us about a meal your mother used to make.", hi: "अपनी माँ के हाथ का कोई खाना बताइए।" },
  { en: "What did your grandmother teach you about life?", hi: "दादी-नानी ने ज़िंदगी के बारे में क्या सिखाया?" },
  { en: "What's a family tradition you cherish?", hi: "कोई पारिवारिक परंपरा बताइए जो आपको प्रिय है।" },
  { en: "Tell us about the day you got married.", hi: "अपनी शादी के दिन के बारे में बताइए।" },
  { en: "What's a recipe passed down in your family?", hi: "परिवार में पीढ़ियों से चली आ रही कोई रेसिपी बताइए।" },
  { en: "What's your favorite memory with your siblings?", hi: "भाई-बहनों के साथ आपकी पसंदीदा याद क्या है?" },
  { en: "Tell us about your father — what kind of person was he?", hi: "अपने पिताजी के बारे में बताइए — वो कैसे इंसान थे?" },
  { en: "What did family dinners look like in your home?", hi: "आपके घर में खाने का वक़्त कैसा होता था?" },
  { en: "Tell us about a family reunion or gathering.", hi: "किसी पारिवारिक मिलन या समारोह के बारे में बताइए।" },
  { en: "Who in your family do you take after the most?", hi: "परिवार में आप सबसे ज़्यादा किस पर गए हैं?" },
  { en: "What's a funny story your family loves to retell?", hi: "परिवार में बार-बार सुनाई जाने वाली कोई मज़ेदार कहानी बताइए।" },
  { en: "What values did your parents instill in you?", hi: "माता-पिता ने आपको कौन सी क़दरें सिखाईं?" },

  // ─── FOOD & COOKING ───────────────────────────────────────
  { en: "What's your favorite street food from growing up?", hi: "बचपन का पसंदीदा स्ट्रीट फ़ूड क्या था?" },
  { en: "What dish do you cook better than anyone?", hi: "कौन सी डिश आप सबसे अच्छी बनाते हैं?" },
  { en: "Tell us about a memorable meal you had.", hi: "कोई यादगार खाने के बारे में बताइए।" },
  { en: "What food reminds you of home?", hi: "कौन सा खाना आपको घर की याद दिलाता है?" },
  { en: "What's a dish you tried for the first time and fell in love with?", hi: "कौन सी डिश पहली बार खाई और दिल जीत लिया?" },
  { en: "Tell us about the kitchen in your childhood home.", hi: "बचपन के घर की रसोई के बारे में बताइए।" },

  // ─── FESTIVALS & CELEBRATIONS ─────────────────────────────
  { en: "What was Diwali like in your childhood home?", hi: "बचपन में दिवाली कैसी होती थी?" },
  { en: "How did your family celebrate Holi?", hi: "आपके परिवार में होली कैसे मनाते थे?" },
  { en: "Tell us about a festival you'll never forget.", hi: "कोई त्योहार बताइए जो आप कभी नहीं भूलेंगे।" },
  { en: "What was Raksha Bandhan like in your home?", hi: "आपके घर में रक्षा बंधन कैसा होता था?" },
  { en: "Describe a wedding you'll never forget.", hi: "कोई शादी बताइए जो आप कभी नहीं भूलेंगे।" },
  { en: "What's a birthday celebration you remember fondly?", hi: "कोई जन्मदिन का जश्न जो आपको याद है?" },
  { en: "How did your neighborhood celebrate Independence Day?", hi: "आपके मोहल्ले में स्वतंत्रता दिवस कैसे मनाते थे?" },
  { en: "Tell us about a Ganesh Chaturthi or Navratri you remember.", hi: "गणेश चतुर्थी या नवरात्रि की कोई याद बताइए।" },
  { en: "What's your favorite thing about Makar Sankranti or Pongal?", hi: "मकर संक्रांति या पोंगल की सबसे अच्छी बात क्या है?" },
  { en: "Tell us about a Christmas or New Year celebration you enjoyed.", hi: "क्रिसमस या नए साल के जश्न की कोई याद बताइए।" },

  // ─── PLACES & TRAVEL ──────────────────────────────────────
  { en: "Describe a place you loved visiting as a child.", hi: "बचपन में आप कहाँ जाना सबसे ज़्यादा पसंद करते थे?" },
  { en: "Tell us about a train journey you remember.", hi: "कोई ट्रेन का सफ़र बताइए जो याद है।" },
  { en: "Tell us about your village or mohalla.", hi: "अपने गाँव या मोहल्ले के बारे में बताइए।" },
  { en: "What's a city or town you wish you could visit again?", hi: "कौन सा शहर या कस्बा है जहाँ आप फिर जाना चाहेंगे?" },
  { en: "Describe the most beautiful place you've ever seen.", hi: "सबसे सुंदर जगह जो आपने कभी देखी है, उसका वर्णन करें।" },
  { en: "Have you ever been on a pilgrimage? Tell us about it.", hi: "क्या आप कभी तीर्थ यात्रा पर गए? उसके बारे में बताइए।" },
  { en: "What was the longest journey you ever took?", hi: "सबसे लंबा सफ़र कौन सा था जो आपने किया?" },
  { en: "Tell us about your first time on an airplane or a bus ride.", hi: "पहली बार हवाई जहाज़ या बस की सवारी के बारे में बताइए।" },

  // ─── FAITH & SPIRITUALITY ─────────────────────────────────
  { en: "Tell us about your favorite temple, mosque, or holy place.", hi: "अपने पसंदीदा मंदिर, मस्जिद, या पवित्र स्थान के बारे में बताइए।" },
  { en: "Is there a prayer or mantra that brings you peace?", hi: "कोई प्रार्थना या मंत्र है जो आपको शांति देता है?" },
  { en: "Tell us about a moment you felt deeply grateful.", hi: "ऐसा कोई पल बताइए जब आपने गहरी कृतज्ञता महसूस की।" },
  { en: "What's a life lesson you learned from your faith?", hi: "आपकी आस्था ने आपको ज़िंदगी का कौन सा सबक सिखाया?" },
  { en: "Tell us about a religious ceremony that was meaningful to you.", hi: "कोई धार्मिक अनुष्ठान बताइए जो आपके लिए बहुत मायने रखता है।" },

  // ─── MUSIC & ARTS ─────────────────────────────────────────
  { en: "What song always makes you smile?", hi: "कौन सा गाना सुनकर आप हमेशा मुस्कुराते हैं?" },
  { en: "What's a folk song or lullaby from your childhood?", hi: "बचपन का कोई लोकगीत या लोरी सुनाइए।" },
  { en: "Do you remember a film that changed how you see the world?", hi: "कोई फ़िल्म जिसने दुनिया देखने का नज़रिया बदल दिया?" },
  { en: "Tell us about a concert, play, or performance you attended.", hi: "किसी संगीत कार्यक्रम या नाटक के बारे में बताइए जो आपने देखा।" },
  { en: "What's a song that reminds you of someone special?", hi: "कौन सा गाना किसी खास इंसान की याद दिलाता है?" },
  { en: "Did you ever learn to play an instrument or sing?", hi: "क्या आपने कभी कोई वाद्य यंत्र बजाना या गाना सीखा?" },

  // ─── WISDOM & ADVICE ──────────────────────────────────────
  { en: "What's the best advice someone gave you?", hi: "किसी ने आपको सबसे अच्छी सलाह क्या दी?" },
  { en: "What advice would you give to your younger self?", hi: "अपने छोटे रूप को आप क्या सलाह देंगे?" },
  { en: "What's the most important lesson life taught you?", hi: "ज़िंदगी ने आपको सबसे बड़ा सबक क्या सिखाया?" },
  { en: "What's something you wish more people understood?", hi: "कोई बात जो आप चाहते हैं ज़्यादा लोग समझें?" },
  { en: "What does happiness mean to you now versus when you were young?", hi: "अब खुशी का मतलब क्या है बनिस्बत जब आप जवान थे?" },
  { en: "If you could pass one message to future generations, what would it be?", hi: "अगर आगे आने वाली पीढ़ियों को एक संदेश दे सकें तो क्या होगा?" },

  // ─── WORK & PURPOSE ───────────────────────────────────────
  { en: "What was your first job?", hi: "आपकी पहली नौकरी क्या थी?" },
  { en: "What's something you're really proud of accomplishing?", hi: "किस उपलब्धि पर आपको सबसे ज़्यादा गर्व है?" },
  { en: "Who was a mentor or teacher that changed your life?", hi: "कौन से गुरु ने आपकी ज़िंदगी बदल दी?" },
  { en: "What's the hardest challenge you overcame in your career?", hi: "करियर में सबसे बड़ी चुनौती कौन सी थी जो आपने पार की?" },
  { en: "Tell us about a colleague or coworker you'll never forget.", hi: "किसी सहकर्मी के बारे में बताइए जिन्हें आप कभी नहीं भूलेंगे।" },
  { en: "What did you dream of becoming when you were young?", hi: "बचपन में आप क्या बनना चाहते थे?" },

  // ─── NATURE & SEASONS ─────────────────────────────────────
  { en: "Describe a monsoon memory that makes you happy.", hi: "बारिश की कोई ऐसी याद जो खुश कर दे।" },
  { en: "What's your favorite season and why?", hi: "आपका पसंदीदा मौसम कौन सा है और क्यों?" },
  { en: "Tell us about a time you watched a sunrise or sunset.", hi: "कभी सूर्योदय या सूर्यास्त देखने का अनुभव बताइए।" },
  { en: "Do you have a favorite flower or tree?", hi: "आपका पसंदीदा फूल या पेड़ कौन सा है?" },
  { en: "Describe the sound of rain on your rooftop.", hi: "छत पर बारिश की आवाज़ का वर्णन करें।" },
  { en: "What did your garden or courtyard look like?", hi: "आपका बगीचा या आंगन कैसा दिखता था?" },

  // ─── LOVE & RELATIONSHIPS ─────────────────────────────────
  { en: "Tell us about the first time you fell in love.", hi: "पहली बार प्यार होने के बारे में बताइए।" },
  { en: "What's the kindest thing someone has ever done for you?", hi: "किसी ने आपके लिए सबसे दयालु काम कौन सा किया?" },
  { en: "How did you meet your life partner?", hi: "आप अपने जीवनसाथी से कैसे मिले?" },
  { en: "What's the secret to a lasting relationship?", hi: "एक लंबे रिश्ते का राज़ क्या है?" },
  { en: "Tell us about a friendship that has lasted a lifetime.", hi: "एक ऐसी दोस्ती के बारे में बताइए जो उम्र भर चली।" },

  // ─── EVERYDAY MOMENTS ─────────────────────────────────────
  { en: "What does a perfect morning look like for you?", hi: "आपकी एक आदर्श सुबह कैसी होती है?" },
  { en: "What's something small that always makes your day?", hi: "कौन सी छोटी सी बात आपका दिन बना देती है?" },
  { en: "Tell us about a pet you had or wanted.", hi: "किसी पालतू जानवर के बारे में बताइए जो आपके पास था या आप चाहते थे।" },
  { en: "What's your favorite time of day?", hi: "दिन का आपका सबसे पसंदीदा वक़्त कौन सा है?" },
  { en: "Describe the view from a window you loved.", hi: "किसी खिड़की से दिखने वाले नज़ारे का वर्णन करें जो आपको प्रिय था।" },
  { en: "What's something you could do for hours without getting bored?", hi: "कौन सी चीज़ आप घंटों कर सकते हैं बिना ऊबे?" },

  // ─── CULTURE & TRADITIONS ─────────────────────────────────
  { en: "Describe the rangoli your family used to make.", hi: "आपके घर में कैसी रंगोली बनती थी?" },
  { en: "What clothes did you love wearing as a child?", hi: "बचपन में कौन से कपड़े पहनना पसंद था?" },
  { en: "Tell us about a ritual that's unique to your community.", hi: "अपने समुदाय की कोई अनोखी रस्म बताइए।" },
  { en: "What's a custom that you practiced but younger people don't know about?", hi: "कोई रीति-रिवाज़ जो आप मानते थे पर नई पीढ़ी को नहीं पता?" },
  { en: "What's the story behind your name?", hi: "आपके नाम के पीछे क्या कहानी है?" },

  // ─── MILESTONES & TURNING POINTS ──────────────────────────
  { en: "Tell us about a moment that changed your life forever.", hi: "ऐसा कोई पल बताइए जिसने आपकी ज़िंदगी हमेशा के लिए बदल दी।" },
  { en: "What was the proudest moment of your life?", hi: "आपकी ज़िंदगी का सबसे गर्व का पल कौन सा था?" },
  { en: "Describe the day your first child was born.", hi: "अपने पहले बच्चे के जन्म का दिन बताइए।" },
  { en: "Tell us about a time you stood up for what you believed in.", hi: "जब आपने अपनी बात के लिए खड़े होकर लड़ाई लड़ी, वो बताइए।" },
  { en: "What was the bravest thing you've ever done?", hi: "आपने अब तक का सबसे बहादुरी भरा काम क्या किया?" },

  // ─── DREAMS & IMAGINATION ─────────────────────────────────
  { en: "If you could relive one day of your life, which would it be?", hi: "अगर ज़िंदगी का एक दिन दोबारा जी सकें तो कौन सा होगा?" },
  { en: "What's a dream you still hold close?", hi: "कोई सपना जो अभी भी दिल के करीब है?" },
  { en: "If you could have dinner with anyone, living or passed, who would it be?", hi: "अगर किसी के साथ खाना खा सकें — चाहे वो हों या न हों — तो कौन होगा?" },
  { en: "What would you tell the world if everyone was listening?", hi: "अगर पूरी दुनिया सुन रही हो तो आप क्या कहेंगे?" },

  // ─── GRATITUDE & REFLECTION ───────────────────────────────
  { en: "What are you most grateful for in life?", hi: "ज़िंदगी में आप सबसे ज़्यादा किसके लिए शुक्रगुज़ार हैं?" },
  { en: "Tell us about a time someone surprised you with kindness.", hi: "जब किसी ने अचानक प्यार या दया दिखाई, वो बताइए।" },
  { en: "What brings you peace when the world feels noisy?", hi: "जब दुनिया शोर लगती है तो आपको शांति क्या देती है?" },
  { en: "What's a simple pleasure you've enjoyed throughout your life?", hi: "ज़िंदगी भर कौन सा सादा सुख आपने उठाया?" },
  { en: "Describe a moment you felt truly content.", hi: "ऐसा कोई पल बताइए जब आपने सच में संतोष महसूस किया।" },

  // ─── HUMOR & LIGHTHEARTED ─────────────────────────────────
  { en: "What's the funniest thing that ever happened to you?", hi: "आपके साथ हुई सबसे मज़ेदार बात कौन सी है?" },
  { en: "Tell us a joke or funny saying your family loves.", hi: "कोई चुटकुला या कहावत सुनाइए जो परिवार में पसंद की जाती है।" },
  { en: "What's the silliest argument you've ever had?", hi: "सबसे बेवकूफ़ी वाली बहस कौन सी थी जो आपने की?" },
  { en: "Tell us about a time you laughed so hard you cried.", hi: "कब इतना हँसे कि आँखों से आँसू आ गए?" },

  // ─── HOBBIES & PASSIONS ───────────────────────────────────
  { en: "What hobby or craft have you enjoyed the most?", hi: "कौन सा शौक या हुनर आपने सबसे ज़्यादा एन्जॉय किया?" },
  { en: "Do you enjoy reading? What's a book that stayed with you?", hi: "क्या आप पढ़ना पसंद करते हैं? कोई किताब जो दिल में रह गई?" },
  { en: "Tell us about something you learned to do later in life.", hi: "कुछ ऐसा जो आपने बड़ी उम्र में सीखा, उसके बारे में बताइए।" },
  { en: "What's a skill you wish more people would learn?", hi: "कोई हुनर जो आप चाहते हैं ज़्यादा लोग सीखें?" },

  // ─── HEALTH & WELLBEING ───────────────────────────────────
  { en: "What keeps you feeling strong and healthy?", hi: "क्या चीज़ आपको मज़बूत और स्वस्थ रखती है?" },
  { en: "How are you feeling today? Share whatever's on your mind.", hi: "आज आप कैसा महसूस कर रहे हैं? जो मन में हो वो बताइए।" },
  { en: "What's your favorite way to relax?", hi: "आराम करने का आपका पसंदीदा तरीका क्या है?" },
  { en: "Tell us about something that made you smile today.", hi: "आज किस बात ने आपको मुस्कुराया?" },

  // ─── LEGACY & MESSAGES ────────────────────────────────────
  { en: "What would you like your grandchildren to know about you?", hi: "आप चाहेंगे कि आपके पोते-पोतियों को आपके बारे में क्या पता हो?" },
  { en: "What's a story about your family history that should be preserved?", hi: "परिवार के इतिहास की कोई कहानी जो संभाल कर रखनी चाहिए?" },
  { en: "Record a message for someone you love.", hi: "किसी अपने के लिए एक संदेश रिकॉर्ड करें।" },
  { en: "What tradition would you love to see continued?", hi: "कौन सी परंपरा आप आगे चलती देखना चाहेंगे?" },
  { en: "If your life was a book, what would you name it?", hi: "अगर आपकी ज़िंदगी एक किताब होती तो उसका नाम क्या होता?" },
];

// ─── NO-REPEAT SHUFFLER ────────────────────────────────────────────
// Uses sessionStorage to track used indices so prompts don't repeat
// until all have been shown.

const STORAGE_KEY = "anvaya_used_prompt_indices";

function getUsedIndices(): Set<number> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveUsedIndices(set: Set<number>) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function getNextPromptIndex(currentIndex?: number): number {
  const total = MEMORY_PROMPTS.length;
  let used = getUsedIndices();

  // If all used, reset
  if (used.size >= total) {
    used = new Set();
  }

  // Build pool of available indices (excluding current if provided)
  const available: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!used.has(i) && i !== currentIndex) available.push(i);
  }

  // Fallback if somehow empty
  if (available.length === 0) {
    used = new Set();
    for (let i = 0; i < total; i++) {
      if (i !== currentIndex) available.push(i);
    }
  }

  const picked = available[Math.floor(Math.random() * available.length)];
  used.add(picked);
  saveUsedIndices(used);
  return picked;
}
