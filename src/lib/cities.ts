// ~600 major world cities with strong Indian coverage
export const CITIES: string[] = [
  // ── India (~80 cities) ──
  "Mumbai, India","Delhi, India","Bangalore, India","Hyderabad, India","Ahmedabad, India",
  "Chennai, India","Kolkata, India","Pune, India","Jaipur, India","Lucknow, India",
  "Kanpur, India","Nagpur, India","Indore, India","Thane, India","Bhopal, India",
  "Visakhapatnam, India","Patna, India","Vadodara, India","Ghaziabad, India","Ludhiana, India",
  "Agra, India","Nashik, India","Faridabad, India","Meerut, India","Rajkot, India",
  "Varanasi, India","Srinagar, India","Aurangabad, India","Dhanbad, India","Amritsar, India",
  "Navi Mumbai, India","Allahabad, India","Ranchi, India","Howrah, India","Coimbatore, India",
  "Jabalpur, India","Gwalior, India","Vijayawada, India","Jodhpur, India","Madurai, India",
  "Raipur, India","Kota, India","Chandigarh, India","Guwahati, India","Solapur, India",
  "Hubli, India","Mysore, India","Tiruchirappalli, India","Bareilly, India","Aligarh, India",
  "Tiruppur, India","Moradabad, India","Jalandhar, India","Bhubaneswar, India","Salem, India",
  "Warangal, India","Guntur, India","Bhiwandi, India","Saharanpur, India","Gorakhpur, India",
  "Bikaner, India","Amravati, India","Noida, India","Jamshedpur, India","Bhilai, India",
  "Cuttack, India","Firozabad, India","Kochi, India","Nellore, India","Bhavnagar, India",
  "Dehradun, India","Durgapur, India","Asansol, India","Rourkela, India","Nanded, India",
  "Kolhapur, India","Ajmer, India","Gulbarga, India","Jamnagar, India","Ujjain, India",
  "Loni, India","Siliguri, India","Jhansi, India","Ulhasnagar, India","Mangalore, India",
  "Erode, India","Belgaum, India","Ambattur, India","Tirunelveli, India","Shimla, India",
  "Gangtok, India","Imphal, India","Shillong, India","Aizawl, India","Itanagar, India",
  "Panaji, India","Pondicherry, India","Thiruvananthapuram, India",

  // ── East Asia ──
  "Tokyo, Japan","Osaka, Japan","Yokohama, Japan","Nagoya, Japan","Sapporo, Japan","Kyoto, Japan","Fukuoka, Japan","Kobe, Japan",
  "Beijing, China","Shanghai, China","Guangzhou, China","Shenzhen, China","Chengdu, China","Wuhan, China","Hangzhou, China","Xi'an, China","Nanjing, China","Chongqing, China","Tianjin, China","Suzhou, China","Dongguan, China","Harbin, China","Dalian, China","Qingdao, China","Kunming, China","Changsha, China",
  "Seoul, South Korea","Busan, South Korea","Incheon, South Korea","Daegu, South Korea",
  "Taipei, Taiwan","Kaohsiung, Taiwan",
  "Hong Kong, China","Macau, China",
  "Ulaanbaatar, Mongolia",

  // ── Southeast Asia ──
  "Singapore, Singapore",
  "Bangkok, Thailand","Chiang Mai, Thailand","Phuket, Thailand",
  "Kuala Lumpur, Malaysia","Penang, Malaysia","Johor Bahru, Malaysia",
  "Jakarta, Indonesia","Surabaya, Indonesia","Bandung, Indonesia","Medan, Indonesia","Bali, Indonesia",
  "Manila, Philippines","Cebu, Philippines","Davao, Philippines",
  "Ho Chi Minh City, Vietnam","Hanoi, Vietnam","Da Nang, Vietnam",
  "Phnom Penh, Cambodia","Siem Reap, Cambodia",
  "Yangon, Myanmar","Mandalay, Myanmar",
  "Vientiane, Laos",

  // ── South Asia ──
  "Kathmandu, Nepal","Pokhara, Nepal",
  "Dhaka, Bangladesh","Chittagong, Bangladesh",
  "Colombo, Sri Lanka","Kandy, Sri Lanka",
  "Karachi, Pakistan","Lahore, Pakistan","Islamabad, Pakistan","Rawalpindi, Pakistan","Faisalabad, Pakistan","Peshawar, Pakistan",
  "Kabul, Afghanistan",
  "Thimphu, Bhutan",
  "Malé, Maldives",

  // ── Central Asia ──
  "Tashkent, Uzbekistan","Almaty, Kazakhstan","Nur-Sultan, Kazakhstan",
  "Bishkek, Kyrgyzstan","Dushanbe, Tajikistan","Ashgabat, Turkmenistan",

  // ── Middle East ──
  "Dubai, UAE","Abu Dhabi, UAE","Sharjah, UAE",
  "Riyadh, Saudi Arabia","Jeddah, Saudi Arabia","Mecca, Saudi Arabia","Medina, Saudi Arabia",
  "Doha, Qatar","Muscat, Oman","Kuwait City, Kuwait","Manama, Bahrain",
  "Tehran, Iran","Isfahan, Iran","Shiraz, Iran",
  "Baghdad, Iraq","Erbil, Iraq",
  "Amman, Jordan","Beirut, Lebanon","Damascus, Syria",
  "Jerusalem, Israel","Tel Aviv, Israel",
  "Ankara, Turkey","Istanbul, Turkey","Izmir, Turkey","Antalya, Turkey",

  // ── Africa ──
  "Cairo, Egypt","Alexandria, Egypt",
  "Lagos, Nigeria","Abuja, Nigeria","Kano, Nigeria",
  "Nairobi, Kenya","Mombasa, Kenya",
  "Johannesburg, South Africa","Cape Town, South Africa","Durban, South Africa","Pretoria, South Africa",
  "Addis Ababa, Ethiopia",
  "Dar es Salaam, Tanzania","Zanzibar, Tanzania",
  "Kinshasa, DR Congo",
  "Accra, Ghana","Kumasi, Ghana",
  "Casablanca, Morocco","Marrakech, Morocco","Rabat, Morocco",
  "Tunis, Tunisia",
  "Algiers, Algeria",
  "Dakar, Senegal",
  "Kampala, Uganda",
  "Luanda, Angola",
  "Maputo, Mozambique",
  "Harare, Zimbabwe",
  "Lusaka, Zambia",
  "Windhoek, Namibia",
  "Kigali, Rwanda",
  "Abidjan, Ivory Coast",
  "Douala, Cameroon",
  "Antananarivo, Madagascar",

  // ── Europe ──
  "London, UK","Manchester, UK","Birmingham, UK","Edinburgh, UK","Glasgow, UK","Liverpool, UK","Bristol, UK","Leeds, UK",
  "Paris, France","Lyon, France","Marseille, France","Toulouse, France","Nice, France","Bordeaux, France",
  "Berlin, Germany","Munich, Germany","Hamburg, Germany","Frankfurt, Germany","Cologne, Germany","Stuttgart, Germany","Düsseldorf, Germany",
  "Madrid, Spain","Barcelona, Spain","Valencia, Spain","Seville, Spain","Málaga, Spain","Bilbao, Spain",
  "Rome, Italy","Milan, Italy","Naples, Italy","Turin, Italy","Florence, Italy","Venice, Italy","Bologna, Italy",
  "Amsterdam, Netherlands","Rotterdam, Netherlands","The Hague, Netherlands",
  "Brussels, Belgium","Antwerp, Belgium",
  "Zurich, Switzerland","Geneva, Switzerland","Bern, Switzerland","Basel, Switzerland",
  "Vienna, Austria","Salzburg, Austria",
  "Lisbon, Portugal","Porto, Portugal",
  "Dublin, Ireland","Cork, Ireland",
  "Copenhagen, Denmark","Aarhus, Denmark",
  "Stockholm, Sweden","Gothenburg, Sweden","Malmö, Sweden",
  "Oslo, Norway","Bergen, Norway",
  "Helsinki, Finland","Tampere, Finland",
  "Warsaw, Poland","Kraków, Poland","Wrocław, Poland","Gdańsk, Poland",
  "Prague, Czech Republic","Brno, Czech Republic",
  "Budapest, Hungary",
  "Bucharest, Romania","Cluj-Napoca, Romania",
  "Athens, Greece","Thessaloniki, Greece",
  "Sofia, Bulgaria",
  "Belgrade, Serbia",
  "Zagreb, Croatia","Split, Croatia",
  "Ljubljana, Slovenia",
  "Bratislava, Slovakia",
  "Tallinn, Estonia","Riga, Latvia","Vilnius, Lithuania",
  "Kyiv, Ukraine","Lviv, Ukraine","Odesa, Ukraine",
  "Moscow, Russia","Saint Petersburg, Russia","Novosibirsk, Russia","Yekaterinburg, Russia","Kazan, Russia",
  "Minsk, Belarus",
  "Tbilisi, Georgia","Baku, Azerbaijan","Yerevan, Armenia",
  "Reykjavik, Iceland",
  "Valletta, Malta","Nicosia, Cyprus","Luxembourg City, Luxembourg","Monaco, Monaco",

  // ── North America ──
  "New York, USA","Los Angeles, USA","Chicago, USA","Houston, USA","Phoenix, USA",
  "Philadelphia, USA","San Antonio, USA","San Diego, USA","Dallas, USA","San Jose, USA",
  "Austin, USA","Jacksonville, USA","San Francisco, USA","Seattle, USA","Denver, USA",
  "Washington DC, USA","Nashville, USA","Boston, USA","Portland, USA","Las Vegas, USA",
  "Miami, USA","Atlanta, USA","Minneapolis, USA","Detroit, USA","Charlotte, USA",
  "Orlando, USA","Honolulu, USA","Salt Lake City, USA","Pittsburgh, USA","Cincinnati, USA",
  "Toronto, Canada","Montreal, Canada","Vancouver, Canada","Calgary, Canada","Edmonton, Canada","Ottawa, Canada","Winnipeg, Canada","Quebec City, Canada","Halifax, Canada",
  "Mexico City, Mexico","Guadalajara, Mexico","Monterrey, Mexico","Cancún, Mexico","Puebla, Mexico","Tijuana, Mexico",

  // ── Central America & Caribbean ──
  "Guatemala City, Guatemala","San José, Costa Rica","Panama City, Panama",
  "Havana, Cuba","Santo Domingo, Dominican Republic","Kingston, Jamaica",
  "San Salvador, El Salvador","Tegucigalpa, Honduras","Managua, Nicaragua",
  "Port-au-Prince, Haiti","Nassau, Bahamas","Port of Spain, Trinidad and Tobago",

  // ── South America ──
  "São Paulo, Brazil","Rio de Janeiro, Brazil","Brasília, Brazil","Salvador, Brazil","Fortaleza, Brazil","Belo Horizonte, Brazil","Curitiba, Brazil","Recife, Brazil",
  "Buenos Aires, Argentina","Córdoba, Argentina","Rosario, Argentina","Mendoza, Argentina",
  "Santiago, Chile","Valparaíso, Chile",
  "Lima, Peru","Cusco, Peru","Arequipa, Peru",
  "Bogotá, Colombia","Medellín, Colombia","Cali, Colombia","Cartagena, Colombia",
  "Caracas, Venezuela",
  "Quito, Ecuador","Guayaquil, Ecuador",
  "La Paz, Bolivia","Santa Cruz, Bolivia",
  "Montevideo, Uruguay",
  "Asunción, Paraguay",
  "Georgetown, Guyana","Paramaribo, Suriname",

  // ── Oceania ──
  "Sydney, Australia","Melbourne, Australia","Brisbane, Australia","Perth, Australia","Adelaide, Australia","Gold Coast, Australia","Canberra, Australia","Hobart, Australia",
  "Auckland, New Zealand","Wellington, New Zealand","Christchurch, New Zealand",
  "Suva, Fiji","Port Moresby, Papua New Guinea",
];

/** Filter cities by query (case-insensitive substring match), return up to `limit` results */
export function filterCities(query: string, limit = 8): string[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const results: string[] = [];
  for (const city of CITIES) {
    if (city.toLowerCase().includes(q)) {
      results.push(city);
      if (results.length >= limit) break;
    }
  }
  return results;
}
