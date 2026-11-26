/* catalogo-aramo.js — la lista ÚNICA de productos de ARAMO (2026-11-25).
   Une Surtido (todos los proveedores), La Feria y el ARAMO POS de cada tienda:
   · Un producto es el mismo en todos lados aunque se escriba distinto
     ("MANI PELADO 200G" = "Maní pelado 200 gramos").
   · Cada producto tiene su pasillo: frutas, verduras, hierbas, despensa o raíces.
   · Cada tienda es su propio sistema: el POS de esa tienda publica sus productos y
     precios (tabla aramo_catalogo_tienda) y La Feria de esa tienda usa esos precios.
   La lista de abajo (LISTA) la arma .rediseno/herramientas/hacer-catalogo.js; las reglas
   de este archivo sirven también para los productos nuevos que se agreguen después. */
(function(){
'use strict';
const SUPA_URL='https://gtzkrdefkcbrjzwoehth.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emtyZGVma2Nicmp6d29laHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTUxMzMsImV4cCI6MjA5NTU3MTEzM30.S32-f2m32VR-oAQaeOLi0XjZZqlBlotJFMQxsOuQh48'; // la llave pública de siempre
const CATS=['frutas','verduras','hierbas','despensa','raices'];
const CAT_NOMBRE={frutas:'Frutas',verduras:'Verduras',hierbas:'Hierbas',despensa:'Despensa',raices:'Raíces'};

// ── Nombre → clave: minúsculas, sin tildes, sin "de/en/la", tamaños parejos y sin plural ──
const NUM={un:'1',una:'1',uno:'1',dos:'2',tres:'3',cuatro:'4',cinco:'5',seis:'6',diez:'10',doce:'12',quince:'15',treinta:'30'};
const STOP=new Set(['de','del','en','la','el','los','las','y','con','para','a','al']);
function norm(s){
  let t=String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  t=t.replace(/medio\s+kilo/g,'500g').replace(/1\s*\/\s*2\s*(kg|kilo)s?\b/g,'500g').replace(/\b0[.,]5\s*(kg|kilo)s?\b/g,'500g')
     .replace(/(\d)[.,](\d)/g,'$1_$2')
     .replace(/(\d+)\s*(gramos|gramo|grs|gr|g)\b/g,'$1g').replace(/(\d+)\s*(kilos|kilo|kgs|kg)\b/g,'$1kg')
     .replace(/(\d+)\s*(litros|litro|lts|lt)\b/g,'$1l');
  t=t.replace(/[^a-z0-9_]+/g,' ').trim();
  return t.split(' ').filter(w=>w&&!STOP.has(w)).map(w=>NUM[w]||w)
    .map(w=>w.length>3&&/[^s]s$/.test(w)&&!/\d/.test(w)?w.slice(0,-1):w).join(' ');
}
const idDeNorm=k=>k.replace(/ /g,'_');

// ── Pasillo de un producto que no está en la lista (los nuevos) ──
// El primero que calce manda: primero los casos especiales, después despensa (jugos, pulpas,
// dulces…), y al final hierbas, raíces, frutas y verduras. Lo que no calce va a despensa.
const REGLAS=[
  [/\b(chile dulce|chile morron|maiz dulce|maiz tierno|frijol tierno|chiverre pelota|carolina reaper|tomate pera|tomate uva|tomate cherry|ayote)\b/,'verduras'],
  [/\b(limon dulce|tomate arbol|ensalada fruta|mamon chino|manzana agua|platanito)\b/,'frutas'],
  [/\b(raiz chayote|camote)\b/,'raices'],
  [/\b(jugo|pulpa|mermelada|jalea|queque|bizcocho|galleta|kombucha|horchata|crocante|garapinado|confite|cajeta|turron|salsa|tabasco|mayonesa|aderezo|crema|mantequilla|manteca|vinagre|conserva|encurtido|bola coco|pina colada|agua pipa|agua|harina|tortilla|tortillla|pan|bollo|empanada|pupusa|deshidratad[ao]|seco|molido|miel|arroz|frijol|lenteja|garbanzo|chia|linaza|cebada|pasa|almendra|pistacho|semilla|mani|tapa dulce|dulce|achiote|canela|clavo|pimienta|bicarbonato|condimento|cafe|carbon|pinol|huevo|chan|jamaica|hoja tamal|sobado|prestino|yuplon|chubby|powerade|mozote|jakimchi|kimchi|kern|tartara|coctel|cocktail|queso|leche|botella|tazita|carretica|ilustrado|illustrado)\b/,'despensa'],
  [/\b(albahaca|cebollino|culantro|eneldo|hierbabuena|hierba buena|menta|oregano|perejil|romero|tomillo|manzanilla|cuculmeca|sabila|zacate)\b/,'hierbas'],
  [/\b(papa|yuca|yuquita|tiquisque|tiquizque|nampi|nanpi|name|malanga|arracache|jengibre|curcuma|ajo|platano)\b/,'raices'],
  [/\b(aguacate|anona|arandano|banano|guineo|carambola|cas|cereza|ciruela|coco|fresa|granada|granadilla|guaba|guanabana|guayaba|higo|jocote|kiwi|limon|mamon|mandarina|manga|mango|manzana|maracuya|maranon|melocoton|melon|mora|nance|naranja|naranjilla|nectarina|nispero|papaya|pera|pina|pitaya|pithaya|pipa|pomelo|sandia|tamarindo|toronja|uchuva|uva|zapote|caimito|fruta|durazno|mangostino|mangostan|rambutan|lichi|frambuesa|grosella|pitahaya|mamey|zarzamora|toronjil fruta)\b/,'frutas'],
  [/\b(ayote|berenjena|berro|bok choy|bak choi|brocoli|cebolla|chayote|chile|coliflor|elote|espinaca|esparrago|hongo|lechuga|kale|mostaza|palmito|pepino|puerro|rabano|raba|remolacha|repollo|rucula|arugula|tomate|vainica|arveja|arverja|zanahoria|zapallo|zucchini|zukini|alfalfa|microgreen|flor comestible|vegetale?|ensalada|picadura|sancocho|apio|pejiballe|pejibaye|tacaco|chiverre)\b/,'verduras'],
];
function reglaCat(k){for(const [r,c] of REGLAS)if(r.test(k))return c;return 'despensa';}

// ── Dibujito de cada producto ──
const EMOJI=[
  [/\bchile dulce|chile morron\b/,'🫑'],[/\b(agua pipa|pipa|coco)\b/,'🥥'],[/\b(banano|guineo|platano|platanito)\b/,'🍌'],[/\baguacate\b/,'🥑'],
  [/\blimon\b/,'🍋'],[/\b(naranja|mandarina|naranjilla|toronja|pomelo)\b/,'🍊'],[/\bmanzana\b/,'🍎'],[/\bpera\b/,'🍐'],[/\bpina\b/,'🍍'],
  [/\bsandia\b/,'🍉'],[/\bmelon\b/,'🍈'],[/\bfresa\b/,'🍓'],[/\buva\b/,'🍇'],[/\b(mora|arandano)\b/,'🫐'],[/\bcereza\b/,'🍒'],
  [/\b(mango|manga)\b/,'🥭'],[/\bkiwi\b/,'🥝'],[/\b(melocoton|nectarina|durazno)\b/,'🍑'],[/\btomate\b/,'🍅'],[/\bcebolla\b/,'🧅'],
  [/\bajo\b/,'🧄'],[/\bchile\b/,'🌶️'],[/\bzanahoria\b/,'🥕'],[/\b(lechuga|repollo|espinaca|kale|bok choy|bak choi|apio|berro|rucula|arugula)\b/,'🥬'],
  [/\b(pepino|zucchini|zukini)\b/,'🥒'],[/\b(brocoli|coliflor)\b/,'🥦'],[/\b(elote|maiz)\b/,'🌽'],[/\bhongo\b/,'🍄'],[/\bberenjena\b/,'🍆'],
  [/\b(papa)\b/,'🥔'],[/\b(camote|yuca|yuquita|nampi|nanpi|name|tiquisque|malanga|arracache)\b/,'🍠'],[/\bjengibre\b/,'🫚'],[/\bhuevo\b/,'🥚'],
  [/\barroz\b/,'🍚'],[/\b(frijol|lenteja|garbanzo|arveja|vainica)\b/,'🫘'],[/\b(mani|almendra|pistacho)\b/,'🥜'],[/\bmiel\b/,'🍯'],
  [/\b(pan|bollo)\b/,'🥖'],[/\b(queque|bizcocho)\b/,'🍰'],[/\bgalleta\b/,'🍪'],[/\b(jugo|kombucha|horchata|pulpa)\b/,'🧃'],[/\bcafe\b/,'☕'],
  [/\btortilla\b/,'🫓'],[/\bqueso\b/,'🧀'],[/\bmantequilla\b/,'🧈'],[/\b(ayote|zapallo)\b/,'🎃'],[/\bremolacha\b/,'🟣'],[/\bchayote\b/,'🟢'],
];
const EMOJI_CAT={frutas:'🍈',verduras:'🥬',hierbas:'🌿',despensa:'🧺',raices:'🥔'};
function emojiDe(k,c){for(const [r,e] of EMOJI)if(r.test(k))return e;return EMOJI_CAT[c]||'🧺';}

// Unidad de Surtido o del POS → unidad de La Feria
function unidadFeria(u){
  const x=norm(u||'');
  if(/^(kg|kilo|kilogramo)$/.test(x))return 'kg';
  if(/^(caja)$/.test(x))return 'caja';if(/^(bolsa|bolsita)$/.test(x))return 'bolsa';
  if(/^(atado|rollo)$/.test(x))return 'rollo';if(/^(paquete)$/.test(x))return 'paquete';
  if(/^(bandeja)$/.test(x))return 'bandeja';if(/^(racimo)$/.test(x))return 'racimo';
  return 'unid';
}
// Nombre bonito: "AGUA PIPA BOTELLA GRANDE" → "Agua pipa botella grande"
function nombreBonito(n){
  const s=String(n||'').replace(/\s+/g,' ').trim();
  if(!s)return s;
  const letras=s.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g,'');
  const t=letras&&letras===letras.toUpperCase()?s.toLowerCase():s;
  return t.charAt(0).toUpperCase()+t.slice(1);
}

/*LISTA*/const LISTA=[
{"id":"aguacate","n":"Aguacate","c":"frutas","e":"🥑","u":"unid","f":"aguacate"},
{"id":"aguacate_kajhalu","n":"Aguacate kajhalú","c":"frutas","e":"🥑","u":"unid"},
{"id":"aguacate_nacional","n":"Aguacate nacional","c":"frutas","e":"🥑","u":"unid"},
{"id":"anona","n":"Anona","c":"frutas","e":"🍈","u":"unid"},
{"id":"arandano","n":"Arándano","c":"frutas","e":"🫐","u":"kg"},
{"id":"banano","n":"Banano","c":"frutas","e":"🍌","u":"unid","f":"banano"},
{"id":"banano_datil","n":"Banano dátil","c":"frutas","e":"🍌","u":"unid"},
{"id":"banano_exportacion","n":"Banano exportación","c":"frutas","e":"🍌","u":"unid"},
{"id":"banano_mano","n":"Banano mano","c":"frutas","e":"🍌","u":"unid"},
{"id":"banano_suelto","n":"Banano suelto","c":"frutas","e":"🍌","u":"unid"},
{"id":"caimito","n":"Caimito","c":"frutas","e":"🍈","u":"unid"},
{"id":"carambola","n":"Carambola","c":"frutas","e":"🍈","u":"unid"},
{"id":"cas","n":"Cas","c":"frutas","e":"🍈","u":"kg","f":"cas"},
{"id":"cas_congelado","n":"Cas congelado","c":"frutas","e":"🍈","u":"kg"},
{"id":"cereza","n":"Cereza","c":"frutas","e":"🍒","u":"kg"},
{"id":"ciruela","n":"Ciruela","c":"frutas","e":"🍈","u":"kg"},
{"id":"coco","n":"Coco","c":"frutas","e":"🥥","u":"unid"},
{"id":"ensalada_fruta","n":"Ensalada frutas","c":"frutas","e":"🍈","u":"unid"},
{"id":"fresa","n":"Fresa","c":"frutas","e":"🍓","u":"kg","f":"fresa"},
{"id":"fresa_congelada","n":"Fresa congelada","c":"frutas","e":"🍓","u":"kg"},
{"id":"fresa_promo_400g","n":"Fresa promo 400 g","c":"frutas","e":"🍓","u":"unid"},
{"id":"granada_real","n":"Granada real","c":"frutas","e":"🍈","u":"unid"},
{"id":"granadilla","n":"Granadilla","c":"frutas","e":"🍈","u":"kg"},
{"id":"guaba","n":"Guaba","c":"frutas","e":"🍈","u":"unid"},
{"id":"guanabana","n":"Guanábana","c":"frutas","e":"🍈","u":"kg","f":"guanabana"},
{"id":"guanabana_congelada","n":"Guanábana congelada","c":"frutas","e":"🍈","u":"kg"},
{"id":"guayaba","n":"Guayaba","c":"frutas","e":"🍈","u":"kg"},
{"id":"guayaba_rosada","n":"Guayaba rosada","c":"frutas","e":"🍈","u":"kg"},
{"id":"guineo","n":"Guineo","c":"frutas","e":"🍌","u":"unid"},
{"id":"higo_bolsita","n":"Higo bolsita","c":"frutas","e":"🍈","u":"kg"},
{"id":"jocote","n":"Jocote","c":"frutas","e":"🍈","u":"unid"},
{"id":"kiwi","n":"Kiwi","c":"frutas","e":"🥝","u":"unid","f":"kiwi"},
{"id":"kiwi_gold","n":"Kiwi Gold","c":"frutas","e":"🥝","u":"unid"},
{"id":"limon","n":"Limón","c":"frutas","e":"🍋","u":"kg"},
{"id":"limon_dulce","n":"Limón dulce","c":"frutas","e":"🍋","u":"kg"},
{"id":"limon_mandarino","n":"Limón mandarina","c":"frutas","e":"🍋","u":"unid","f":"limon","a":["limon mandarino"]},
{"id":"limon_mecino","n":"Limón mecino","c":"frutas","e":"🍋","u":"unid","a":["limon mesino"]},
{"id":"limon_persa","n":"Limón persa","c":"frutas","e":"🍋","u":"kg"},
{"id":"mamon","n":"Mamon","c":"frutas","e":"🍈","u":"unid"},
{"id":"mamon_chino","n":"Mamon chino","c":"frutas","e":"🍈","u":"unid"},
{"id":"mandarina","n":"Mandarina","c":"frutas","e":"🍊","u":"unid","f":"mandarina"},
{"id":"mandarina_importada","n":"Mandarina importada","c":"frutas","e":"🍊","u":"kg"},
{"id":"mandarina_nacional","n":"Mandarina nacional","c":"frutas","e":"🍊","u":"kg"},
{"id":"manga","n":"Manga","c":"frutas","e":"🥭","u":"unid"},
{"id":"manga_caja","n":"Manga caja","c":"frutas","e":"🥭","u":"caja","a":["manga caja kg"]},
{"id":"manga_congelada","n":"Manga congelada","c":"frutas","e":"🥭","u":"kg"},
{"id":"mango","n":"Mango","c":"frutas","e":"🥭","u":"unid","f":"mango"},
{"id":"manzana","n":"Manzana","c":"frutas","e":"🍎","u":"unid","f":"manzana"},
{"id":"manzana_agua","n":"Manzana agua","c":"frutas","e":"🍎","u":"unid"},
{"id":"manzana_golden","n":"Manzana Golden","c":"frutas","e":"🍎","u":"kg"},
{"id":"manzana_grande","n":"Manzana grande","c":"frutas","e":"🍎","u":"kg"},
{"id":"manzana_nacional","n":"Manzana nacional","c":"frutas","e":"🍎","u":"unid"},
{"id":"manzana_pequena","n":"Manzana pequeña","c":"frutas","e":"🍎","u":"kg"},
{"id":"manzana_promo","n":"Manzana promo","c":"frutas","e":"🍎","u":"kg"},
{"id":"maracuya","n":"Maracuyá","c":"frutas","e":"🍈","u":"unid","f":"maracuya"},
{"id":"maracuya_congelada","n":"Maracuyá congelada","c":"frutas","e":"🍈","u":"kg"},
{"id":"maranon","n":"Marañón","c":"frutas","e":"🍈","u":"kg"},
{"id":"maranon_bolinon","n":"Marañón bolinón","c":"frutas","e":"🍈","u":"kg","a":["maranon boli"]},
{"id":"melocoton","n":"Melocotón","c":"frutas","e":"🍑","u":"kg"},
{"id":"melon","n":"Melón","c":"frutas","e":"🍈","u":"unid","f":"melon"},
{"id":"mora","n":"Mora","c":"frutas","e":"🫐","u":"kg","f":"mora"},
{"id":"mora_bandeja_200g","n":"Mora bandeja 200 g","c":"frutas","e":"🫐","u":"caja"},
{"id":"mora_congelada","n":"Mora congelada","c":"frutas","e":"🫐","u":"kg"},
{"id":"mora_grande","n":"Mora grande","c":"frutas","e":"🫐","u":"kg"},
{"id":"mora_mesa","n":"Mora mesa","c":"frutas","e":"🫐","u":"unid"},
{"id":"nance","n":"Nance","c":"frutas","e":"🍈","u":"unid"},
{"id":"naranja","n":"Naranja","c":"frutas","e":"🍊","u":"unid","f":"naranja"},
{"id":"naranja_importada","n":"Naranja importada","c":"frutas","e":"🍊","u":"kg"},
{"id":"naranja_nacional","n":"Naranja nacional","c":"frutas","e":"🍊","u":"unid"},
{"id":"naranjilla","n":"Naranjilla","c":"frutas","e":"🍊","u":"kg"},
{"id":"nectarina","n":"Nectarina","c":"frutas","e":"🍑","u":"kg"},
{"id":"nispero","n":"Níspero","c":"frutas","e":"🍈","u":"unid"},
{"id":"papaya","n":"Papaya","c":"frutas","e":"🧡","u":"unid","f":"papaya"},
{"id":"pera","n":"Pera","c":"frutas","e":"🍐","u":"unid","f":"pera"},
{"id":"pera_bolsa","n":"Pera bolsa","c":"frutas","e":"🍐","u":"caja"},
{"id":"pera_candy","n":"Pera Candy","c":"frutas","e":"🍐","u":"kg"},
{"id":"pera_fiorela","n":"Pera Fiorela","c":"frutas","e":"🍐","u":"kg","a":["pera fiorella u"]},
{"id":"pina","n":"Piña","c":"frutas","e":"🍍","u":"unid","f":"pina"},
{"id":"pina_pequena","n":"Piña pequeña","c":"frutas","e":"🍍","u":"unid"},
{"id":"pipa","n":"Pipa","c":"frutas","e":"🥥","u":"unid","f":"pipa"},
{"id":"pitaya","n":"Pitaya","c":"frutas","e":"🍈","u":"kg","a":["pithaya"]},
{"id":"platanito_grande","n":"Platanito grande","c":"frutas","e":"🍌","u":"unid"},
{"id":"pomelo","n":"Pomelo","c":"frutas","e":"🍊","u":"kg"},
{"id":"sandia","n":"Sandía","c":"frutas","e":"🍉","u":"unid","f":"sandia"},
{"id":"sandia_congelada","n":"Sandia congelada","c":"frutas","e":"🍉","u":"unid"},
{"id":"sandia_promo","n":"Sandia Promo","c":"frutas","e":"🍉","u":"unid"},
{"id":"tamarindo","n":"Tamarindo","c":"frutas","e":"🍈","u":"kg"},
{"id":"tomate_arbol","n":"Tomate de árbol","c":"frutas","e":"🍅","u":"kg"},
{"id":"uchuva","n":"Uchuva","c":"frutas","e":"🍈","u":"kg"},
{"id":"uva","n":"Uva","c":"frutas","e":"🍇","u":"kg","f":"uva"},
{"id":"uva_globo","n":"Uva globo","c":"frutas","e":"🍇","u":"kg"},
{"id":"uva_verde","n":"Uva verde","c":"frutas","e":"🍇","u":"kg"},
{"id":"zapote","n":"Zapote","c":"frutas","e":"🍈","u":"kg"},
{"id":"alfalfa","n":"Alfalfa","c":"verduras","e":"🥬","u":"unid"},
{"id":"apio","n":"Apio","c":"verduras","e":"🥬","u":"unid","f":"apio"},
{"id":"arveja","n":"Arveja","c":"verduras","e":"🫘","u":"kg","a":["arverja"]},
{"id":"ayote","n":"Ayote","c":"verduras","e":"🎃","u":"unid"},
{"id":"ayote_mantequilla","n":"Ayote mantequilla","c":"verduras","e":"🧈","u":"kg"},
{"id":"ayote_sazon","n":"Ayote sazón","c":"verduras","e":"🎃","u":"kg","f":"ayote"},
{"id":"ayote_tierno","n":"Ayote tierno","c":"verduras","e":"🎃","u":"kg"},
{"id":"berenjena","n":"Berenjena","c":"verduras","e":"🍆","u":"unid","f":"berenjena"},
{"id":"berro","n":"Berros","c":"verduras","e":"🥬","u":"unid"},
{"id":"bok_choy","n":"Bok choy","c":"verduras","e":"🥬","u":"kg","a":["bak choi"]},
{"id":"brocoli","n":"Brócoli","c":"verduras","e":"🥦","u":"unid","f":"brocoli"},
{"id":"carolina_reaper","n":"Carolina Reaper","c":"verduras","e":"🥬","u":"kg"},
{"id":"cebolla","n":"Cebolla","c":"verduras","e":"🧅","u":"kg","f":"cebolla"},
{"id":"cebolla_morada","n":"Cebolla morada","c":"verduras","e":"🧅","u":"unid"},
{"id":"chayote","n":"Chayote","c":"verduras","e":"🟢","u":"unid","f":"chayote"},
{"id":"chayote_blanco","n":"Chayote blanco","c":"verduras","e":"🟢","u":"kg"},
{"id":"chayote_negro","n":"Chayote negro","c":"verduras","e":"🟢","u":"kg"},
{"id":"chayote_negro_blanco","n":"Chayote negro/blanco","c":"verduras","e":"🟢","u":"unid"},
{"id":"chile_aji","n":"Chile ají","c":"verduras","e":"🌶️","u":"kg"},
{"id":"chile_caja_2_pack","n":"Chile caja 2 pack","c":"verduras","e":"🌶️","u":"unid"},
{"id":"chile_dragon","n":"Chile dragon","c":"verduras","e":"🌶️","u":"unid"},
{"id":"chile_dulce","n":"Chile dulce","c":"verduras","e":"🫑","u":"unid","f":"chile_dulce"},
{"id":"chile_pelota","n":"Chile en pelotas","c":"verduras","e":"🌶️","u":"kg"},
{"id":"chile_jalapeno","n":"Chile jalapeño","c":"verduras","e":"🌶️","u":"unid"},
{"id":"chile_jalapeno_bolsa","n":"Chile jalapeño en bolsa","c":"verduras","e":"🌶️","u":"caja"},
{"id":"chile_kalalu","n":"Chile kalalu","c":"verduras","e":"🌶️","u":"unid"},
{"id":"chile_morron","n":"Chile morrón","c":"verduras","e":"🫑","u":"kg"},
{"id":"chile_panameno","n":"Chile panameño","c":"verduras","e":"🌶️","u":"unid"},
{"id":"chile_picante","n":"Chile picante","c":"verduras","e":"🌶️","u":"bolsita","f":"chile_picante"},
{"id":"chile_rocoto","n":"Chile rocoto","c":"verduras","e":"🌶️","u":"kg"},
{"id":"chile_sabor","n":"Chile Sabor","c":"verduras","e":"🌶️","u":"unid"},
{"id":"chile_cubanesa","n":"Chiles cubanesas","c":"verduras","e":"🌶️","u":"kg"},
{"id":"chiverre_pelota","n":"Chiverre pelota","c":"verduras","e":"🥬","u":"unid"},
{"id":"coliflor","n":"Coliflor","c":"verduras","e":"🥦","u":"unid","f":"coliflor"},
{"id":"elote","n":"Elote","c":"verduras","e":"🌽","u":"unid","f":"elote"},
{"id":"elote_elote_amarillo","n":"Elote amarillo","c":"verduras","e":"🌽","u":"unid","a":["elote elote amarillo"]},
{"id":"elote_blanco","n":"Elote blanco","c":"verduras","e":"🌽","u":"unid"},
{"id":"ensalada","n":"Ensalada","c":"verduras","e":"🥬","u":"unid"},
{"id":"esparrago","n":"Espárragos","c":"verduras","e":"🥬","u":"unid"},
{"id":"espinaca","n":"Espinaca","c":"verduras","e":"🥬","u":"rollo","f":"espinaca"},
{"id":"flor_comestible","n":"Flor comestible","c":"verduras","e":"🥬","u":"kg"},
{"id":"frijol_tierno_bandeja","n":"Frijol tierno bandejas","c":"verduras","e":"🫘","u":"caja"},
{"id":"hongo_cremini","n":"Hongo cremini","c":"verduras","e":"🍄","u":"kg","a":["hongo crimini"]},
{"id":"hongo_portobello","n":"Hongo portobello","c":"verduras","e":"🍄","u":"kg"},
{"id":"hongo_blanco","n":"Hongos","c":"verduras","e":"🍄","u":"paquete","f":"hongos","a":["hongo blanco"]},
{"id":"lechuga","n":"Lechuga americana","c":"verduras","e":"🥬","u":"unid","f":"lechuga","a":["lechuga"]},
{"id":"lechuga_kale","n":"Lechuga kale","c":"verduras","e":"🥬","u":"unid"},
{"id":"lechuga_repollo","n":"Lechuga repollo","c":"verduras","e":"🥬","u":"unid"},
{"id":"lechuga_romana","n":"Lechuga romana","c":"verduras","e":"🥬","u":"unid"},
{"id":"maiz_dulce","n":"Maíz dulce","c":"verduras","e":"🌽","u":"kg"},
{"id":"maiz_tierno","n":"Maíz tierno","c":"verduras","e":"🌽","u":"unid"},
{"id":"microgreen","n":"Microgreens","c":"verduras","e":"🥬","u":"kg"},
{"id":"mini_vegetale","n":"Mini vegetales","c":"verduras","e":"🥬","u":"unid"},
{"id":"mini_zanahoria","n":"Mini zanahoria","c":"verduras","e":"🥕","u":"kg"},
{"id":"mostaza_china","n":"Mostaza china","c":"verduras","e":"🥬","u":"unid"},
{"id":"palmito","n":"Palmito","c":"verduras","e":"🥬","u":"kg"},
{"id":"pejiballe","n":"Pejiballe","c":"verduras","e":"🥬","u":"unid"},
{"id":"pepino","n":"Pepino","c":"verduras","e":"🥒","u":"unid","f":"pepino"},
{"id":"picadura","n":"Picadura","c":"verduras","e":"🥬","u":"unid"},
{"id":"puerro","n":"Puerros","c":"verduras","e":"🥬","u":"unid"},
{"id":"raba","n":"Raba","c":"verduras","e":"🥬","u":"kg"},
{"id":"rabano","n":"Rábano","c":"verduras","e":"🔴","u":"rollo","f":"rabano"},
{"id":"remolacha","n":"Remolacha","c":"verduras","e":"🟣","u":"kg","f":"remolacha"},
{"id":"repollo_verde_normal","n":"Repollo","c":"verduras","e":"🥬","u":"unid","f":"repollo","a":["repollo verde normal"]},
{"id":"repollo_morado","n":"Repollo morado","c":"verduras","e":"🥬","u":"kg"},
{"id":"repollo_organico","n":"Repollo orgánico","c":"verduras","e":"🥬","u":"kg"},
{"id":"rucula","n":"Rúcula","c":"verduras","e":"🥬","u":"unid","a":["arugula"]},
{"id":"sancocho","n":"Sancocho","c":"verduras","e":"🥬","u":"unid"},
{"id":"tacaco","n":"Tacaco","c":"verduras","e":"🥬","u":"kg"},
{"id":"tomate","n":"Tomate","c":"verduras","e":"🍅","u":"kg","f":"tomate"},
{"id":"tomate_cherry","n":"Tomate cherry","c":"verduras","e":"🍅","u":"kg"},
{"id":"tomate_pera","n":"Tomate pera","c":"verduras","e":"🍐","u":"unid"},
{"id":"tomate_pera_bandeja","n":"Tomate pera bandeja","c":"verduras","e":"🍐","u":"caja"},
{"id":"tomate_uva","n":"Tomate uva","c":"verduras","e":"🍇","u":"unid"},
{"id":"vainica","n":"Vainica","c":"verduras","e":"🫛","u":"kg","f":"vainica"},
{"id":"vainica_bolsa_500g","n":"Vainica bolsa 500 g","c":"verduras","e":"🫘","u":"caja"},
{"id":"vainica_mini","n":"Vainica mini","c":"verduras","e":"🫘","u":"kg"},
{"id":"vegetale","n":"Vegetales","c":"verduras","e":"🥬","u":"unid"},
{"id":"vegetale_mixto_bandeja","n":"Vegetales mixtos bandeja","c":"verduras","e":"🥬","u":"unid"},
{"id":"zanahoria","n":"Zanahoria","c":"verduras","e":"🥕","u":"kg","f":"zanahoria"},
{"id":"zapallo","n":"Zapallo","c":"verduras","e":"🎃","u":"kg"},
{"id":"zucchini","n":"Zucchini","c":"verduras","e":"🥒","u":"kg","f":"zucchini","a":["zukini"]},
{"id":"ajo","n":"Ajo","c":"raices","e":"🧄","u":"unid","f":"ajo"},
{"id":"ajo_criollo","n":"Ajo criollo","c":"raices","e":"🧄","u":"kg"},
{"id":"ajo_caja","n":"Ajo de caja","c":"raices","e":"🧄","u":"caja"},
{"id":"ajo_5_cabeza","n":"Ajo de cinco cabezas","c":"raices","e":"🧄","u":"kg"},
{"id":"ajo_3_cabeza","n":"Ajo de tres cabezas","c":"raices","e":"🧄","u":"kg"},
{"id":"ajo_trenza","n":"Ajo en trenza","c":"raices","e":"🧄","u":"kg"},
{"id":"ajo_negro_grande","n":"Ajo negro grande","c":"raices","e":"🧄","u":"kg"},
{"id":"ajo_negro_pequeno","n":"Ajo negro pequeño","c":"raices","e":"🧄","u":"kg"},
{"id":"ajo_pelado_caja_500g","n":"Ajo pelado caja 500 g","c":"raices","e":"🧄","u":"caja"},
{"id":"ajo_pelado_bolsa","n":"Ajo pelado en bolsa","c":"raices","e":"🧄","u":"caja"},
{"id":"ajo_pelado_caja_grande","n":"Ajo pelado en caja grande","c":"raices","e":"🧄","u":"caja"},
{"id":"arracache","n":"Arracache","c":"raices","e":"🍠","u":"kg","f":"arracache"},
{"id":"camote","n":"Camote","c":"raices","e":"🍠","u":"kg","f":"camote"},
{"id":"camote_zanahoria","n":"Camote zanahoria","c":"raices","e":"🥕","u":"kg"},
{"id":"curcuma","n":"Cúrcuma","c":"raices","e":"🥔","u":"kg"},
{"id":"jengibre","n":"Jengibre","c":"raices","e":"🫚","u":"kg","f":"jengibre"},
{"id":"malanga","n":"Malanga","c":"raices","e":"🍠","u":"kg"},
{"id":"mini_papa","n":"Mini papa","c":"raices","e":"🥔","u":"kg"},
{"id":"name","n":"Ñame","c":"raices","e":"🍠","u":"kg"},
{"id":"nampi","n":"Ñampí","c":"raices","e":"🍠","u":"kg","f":"nampi","a":["nanpi"]},
{"id":"papa","n":"Papa","c":"raices","e":"🥔","u":"kg","f":"papa"},
{"id":"platano","n":"Plátano","c":"raices","e":"🍌","u":"racimo"},
{"id":"platano_maduro","n":"Plátano maduro","c":"raices","e":"🍌","u":"unid","f":"platano","a":["platano maduro suelto"]},
{"id":"platano_maduro_racimo","n":"Plátano maduro racimo","c":"raices","e":"🍌","u":"racimo"},
{"id":"platano_verde_suelto","n":"Plátano verde","c":"raices","e":"🍌","u":"unid","f":"platano_verde","a":["platano verde suelto"]},
{"id":"platano_verde_racimo","n":"Plátano verde racimo","c":"raices","e":"🍌","u":"racimo"},
{"id":"raiz_chayote","n":"Raíz de chayote","c":"raices","e":"🟢","u":"kg"},
{"id":"tiquisque","n":"Tiquizque","c":"raices","e":"🍠","u":"kg","f":"tiquizque","a":["tiquisque"]},
{"id":"yuca","n":"Yuca","c":"raices","e":"🍠","u":"kg","f":"yuca"},
{"id":"yuquita","n":"Yuquitas","c":"raices","e":"🍠","u":"unid"},
{"id":"albahaca","n":"Albahaca","c":"hierbas","e":"🌿","u":"rollo","f":"albahaca"},
{"id":"cebollino","n":"Cebollino","c":"hierbas","e":"🌿","u":"rollo","f":"cebollino"},
{"id":"cuculmeca","n":"Cuculmeca","c":"hierbas","e":"🌿","u":"unid"},
{"id":"culantro","n":"Culantro","c":"hierbas","e":"🌿","u":"rollo","f":"culantro","a":["culantro rollo"]},
{"id":"culantro_coyote","n":"Culantro coyote","c":"hierbas","e":"🌿","u":"rollo","f":"culantro_coyote"},
{"id":"eneldo","n":"Eneldo","c":"hierbas","e":"🌿","u":"unid"},
{"id":"hierbabuena","n":"Hierbabuena","c":"hierbas","e":"🌿","u":"rollo","f":"hierbabuena","a":["hierba buena"]},
{"id":"manzanilla","n":"Manzanilla","c":"hierbas","e":"🌿","u":"kg"},
{"id":"menta","n":"Menta","c":"hierbas","e":"🌿","u":"kg"},
{"id":"oregano","n":"Orégano fresco","c":"hierbas","e":"🌿","u":"rollo","f":"oregano","a":["oregano"]},
{"id":"perejil","n":"Perejil","c":"hierbas","e":"🌿","u":"rollo","f":"perejil"},
{"id":"perejil_bolsa","n":"Perejil bolsa","c":"hierbas","e":"🌿","u":"caja"},
{"id":"romero","n":"Romero","c":"hierbas","e":"🌿","u":"rollo","f":"romero"},
{"id":"sabila","n":"Sabila","c":"hierbas","e":"🌿","u":"unid"},
{"id":"tomillo","n":"Tomillo","c":"hierbas","e":"🌿","u":"unid"},
{"id":"achiote_bolsa","n":"Achiote bolsa","c":"despensa","e":"🧺","u":"caja"},
{"id":"achiote_caja","n":"Achiote caja","c":"despensa","e":"🧺","u":"caja"},
{"id":"aderezo","n":"Aderezos","c":"despensa","e":"🧺","u":"kg"},
{"id":"agua_pipa_pequena","n":"Agua de pipa","c":"despensa","e":"💧","u":"botella","f":"agua_pipa","a":["agua pipa pequena"]},
{"id":"agua_pipa_botella_grande","n":"Agua de pipa botella grande","c":"despensa","e":"🥥","u":"unid"},
{"id":"almendra","n":"Almendra","c":"despensa","e":"🥜","u":"unid"},
{"id":"arroz","n":"Arroz","c":"despensa","e":"🍚","u":"kg","f":"arroz"},
{"id":"arroz_leche","n":"Arroz con leche","c":"despensa","e":"🍚","u":"unid"},
{"id":"bicarbonato","n":"Bicarbonato","c":"despensa","e":"🧺","u":"kg"},
{"id":"bizcocho_amarillo","n":"Bizcocho amarillo","c":"despensa","e":"🍰","u":"unid"},
{"id":"bizcocho_artesanal","n":"Bizcocho artesanal","c":"despensa","e":"🍰","u":"unid"},
{"id":"bola_coco_blanca","n":"Bola de coco blanca","c":"despensa","e":"🥥","u":"unid"},
{"id":"bola_coco_rosada","n":"Bola de coco rosada","c":"despensa","e":"🥥","u":"unid"},
{"id":"bollo_pan","n":"Bollo de pan","c":"despensa","e":"🥖","u":"unid"},
{"id":"cafe_grande","n":"Café grande","c":"despensa","e":"☕","u":"unid"},
{"id":"cafe_pequeno_especialidad","n":"Café pequeño de especialidad","c":"despensa","e":"☕","u":"unid"},
{"id":"caja_cajeta","n":"Caja Cajetas","c":"despensa","e":"🧺","u":"unid"},
{"id":"caja_tartara","n":"Caja Tartara","c":"despensa","e":"🧺","u":"unid"},
{"id":"cajeta_toda","n":"Cajeta todas","c":"despensa","e":"🧺","u":"unid"},
{"id":"canela_molida","n":"Canela molida","c":"despensa","e":"🧺","u":"kg"},
{"id":"canela_rollo","n":"Canela rollo","c":"despensa","e":"🧺","u":"kg"},
{"id":"carbon","n":"Carbon","c":"despensa","e":"🧺","u":"unid"},
{"id":"carretica","n":"Carreticas","c":"despensa","e":"🧺","u":"unid"},
{"id":"cebada","n":"Cebada","c":"despensa","e":"🧺","u":"kg"},
{"id":"chan","n":"Chan","c":"despensa","e":"🧺","u":"kg"},
{"id":"chia","n":"Chía","c":"despensa","e":"🧺","u":"unid"},
{"id":"chile_encurtido","n":"Chile encurtido","c":"despensa","e":"🌶️","u":"kg"},
{"id":"chile_molido","n":"Chile Molido","c":"despensa","e":"🌶️","u":"unid"},
{"id":"chile_seco_bandeja","n":"Chile seco bandeja","c":"despensa","e":"🌶️","u":"unid"},
{"id":"chiverre_conserva","n":"Chiverre conserva","c":"despensa","e":"🧺","u":"unid"},
{"id":"chubby","n":"Chubby","c":"despensa","e":"🧺","u":"unid"},
{"id":"clavo_olor_50g","n":"Clavo de olor 50 g","c":"despensa","e":"🧺","u":"caja","a":["clavo dolor 50g"]},
{"id":"coctel","n":"Cóctel","c":"despensa","e":"🧺","u":"kg"},
{"id":"condimento","n":"Condimentos","c":"despensa","e":"🧺","u":"kg"},
{"id":"confite","n":"Confite","c":"despensa","e":"🧺","u":"unid"},
{"id":"crema","n":"Cremas","c":"despensa","e":"🧺","u":"kg"},
{"id":"crocante_mani","n":"Crocante maní","c":"despensa","e":"🥜","u":"kg"},
{"id":"dasavila","n":"Dasávilas","c":"despensa","e":"🧺","u":"kg"},
{"id":"dulce_molido","n":"Dulce molido","c":"despensa","e":"🧺","u":"kg"},
{"id":"empanada","n":"Empanadas","c":"despensa","e":"🧺","u":"unid"},
{"id":"empanada_belly","n":"Empanadas belly","c":"despensa","e":"🧺","u":"unid"},
{"id":"flor_jamaica","n":"Flor de Jamaica","c":"despensa","e":"🧺","u":"kg"},
{"id":"frijol_blanco","n":"Frijol blanco","c":"despensa","e":"🫘","u":"kg"},
{"id":"frijol_cuba","n":"Frijol cubas","c":"despensa","e":"🫘","u":"kg"},
{"id":"frijol_negro_2kg","n":"Frijol negro 2kg","c":"despensa","e":"🫘","u":"unid"},
{"id":"frijol_rojo","n":"Frijol rojo","c":"despensa","e":"🫘","u":"kg"},
{"id":"frijol_rojo_2kg","n":"Frijol rojo 2kg","c":"despensa","e":"🫘","u":"unid"},
{"id":"frijol_negro","n":"Frijoles","c":"despensa","e":"🫘","u":"kg","f":"frijoles","a":["frijol negro"]},
{"id":"fruta_deshidratada","n":"Fruta deshidratada","c":"despensa","e":"🧺","u":"kg"},
{"id":"galleta","n":"Galleta","c":"despensa","e":"🍪","u":"unid"},
{"id":"galleta_suspiro","n":"Galleta suspiro","c":"despensa","e":"🍪","u":"unid"},
{"id":"garbanzo","n":"Garbanzo","c":"despensa","e":"🫘","u":"kg"},
{"id":"grey","n":"Grey","c":"despensa","e":"🧺","u":"unid"},
{"id":"hoja_tamal","n":"Hoja de tamal","c":"despensa","e":"🧺","u":"kg"},
{"id":"horchata","n":"Horchata","c":"despensa","e":"🧃","u":"kg"},
{"id":"huevo_suelto","n":"Huevo suelto","c":"despensa","e":"🥚","u":"unid"},
{"id":"huevo_15","n":"Huevos (cartón 15)","c":"despensa","e":"🥚","u":"caja","a":["huevo 15"]},
{"id":"huevo_30","n":"Huevos (cartón 30)","c":"despensa","e":"🥚","u":"cartón","f":"huevos","a":["huevo 30","huevo carton"]},
{"id":"illustrado_laguna","n":"Illustrado laguna","c":"despensa","e":"🧺","u":"unid"},
{"id":"jakimchi","n":"Jakimchi","c":"despensa","e":"🧺","u":"unid"},
{"id":"jakimchi_grande","n":"Jakimchi grande","c":"despensa","e":"🧺","u":"unid"},
{"id":"jalea_guayaba","n":"Jalea de guayaba","c":"despensa","e":"🧺","u":"kg"},
{"id":"jugo_naranja","n":"Jugo de naranja","c":"despensa","e":"🍊","u":"unid"},
{"id":"jugo_hiel","n":"Jugo hiel","c":"despensa","e":"🧃","u":"unid"},
{"id":"jugo_manzana","n":"Jugo manzana","c":"despensa","e":"🍎","u":"unid"},
{"id":"jugo_naranja_mango","n":"Jugo naranja mango","c":"despensa","e":"🍊","u":"unid"},
{"id":"jugo_naranja_remolacha","n":"Jugo naranja remolacha","c":"despensa","e":"🍊","u":"unid"},
{"id":"jugo_naranja_zanahoria","n":"Jugo naranja zanahoria","c":"despensa","e":"🍊","u":"unid"},
{"id":"jugo_naranja_zanahoria_1_2l","n":"Jugo naranja zanahoria 1/2 litro","c":"despensa","e":"🍊","u":"unid"},
{"id":"jugo_sandia","n":"Jugo sandia","c":"despensa","e":"🍉","u":"unid"},
{"id":"jugo_sorrel3","n":"Jugo sorrel3","c":"despensa","e":"🧃","u":"unid"},
{"id":"jugo_verde","n":"Jugo verde","c":"despensa","e":"🧃","u":"unid"},
{"id":"kern","n":"Kerns","c":"despensa","e":"🧺","u":"unid"},
{"id":"kombucha","n":"Kombucha","c":"despensa","e":"🧃","u":"unid"},
{"id":"lenteja","n":"Lentejas","c":"despensa","e":"🫘","u":"kg"},
{"id":"linaza","n":"Linaza","c":"despensa","e":"🧺","u":"kg"},
{"id":"maiz_cascado","n":"Maíz cascado","c":"despensa","e":"🌽","u":"kg"},
{"id":"maiz_cascado_bolsa_2kg","n":"Maiz cascado bolsa 2kg","c":"despensa","e":"🌽","u":"bolsa"},
{"id":"mani","n":"Maní","c":"despensa","e":"🥜","u":"bolsa","f":"mani"},
{"id":"mani_cascara","n":"Maní cáscara 200 g","c":"despensa","e":"🥜","u":"caja","a":["mani cascara"]},
{"id":"mani_garapinado_200g","n":"Maní garapiñado 200 g","c":"despensa","e":"🥜","u":"caja"},
{"id":"mani_pelado_200g","n":"Maní pelado 200 g","c":"despensa","e":"🥜","u":"caja"},
{"id":"manteca_cerdo","n":"Manteca cerdo","c":"despensa","e":"🧺","u":"unid"},
{"id":"mantecado","n":"Mantecado","c":"despensa","e":"🧺","u":"unid"},
{"id":"mantequilla_ghee_peq","n":"Mantequilla GHEE peq","c":"despensa","e":"🧈","u":"unid"},
{"id":"mantequilla_grande","n":"Mantequilla grande","c":"despensa","e":"🧈","u":"unid"},
{"id":"mantequilla_romero","n":"Mantequilla romero","c":"despensa","e":"🧈","u":"unid"},
{"id":"mayonesa","n":"Mayonesas","c":"despensa","e":"🧺","u":"unid"},
{"id":"mermelada_vidrio","n":"Mermeladas de vidrio","c":"despensa","e":"🧺","u":"kg"},
{"id":"miel_1_080","n":"Miel 1080 g","c":"despensa","e":"🍯","u":"unid","a":["miel 1_080"]},
{"id":"miel_180g","n":"Miel 180 g","c":"despensa","e":"🍯","u":"unid"},
{"id":"miel_200g","n":"Miel 200 g","c":"despensa","e":"🍯","u":"unid"},
{"id":"miel_500g","n":"Miel 500 g","c":"despensa","e":"🍯","u":"unid"},
{"id":"miel_abeja","n":"Miel de abeja","c":"despensa","e":"🍯","u":"frasco","f":"miel"},
{"id":"miel_panal","n":"Miel panal","c":"despensa","e":"🍯","u":"unid"},
{"id":"mozote","n":"Mozote","c":"despensa","e":"🧺","u":"unid"},
{"id":"palito_queso_tostado","n":"Palitos de queso tostados","c":"despensa","e":"🧀","u":"kg"},
{"id":"pan","n":"Pan","c":"despensa","e":"🥖","u":"unid"},
{"id":"pan_casero","n":"Pan casero","c":"despensa","e":"🥖","u":"unid"},
{"id":"pasa","n":"Pasas","c":"despensa","e":"🧺","u":"kg"},
{"id":"pimienta_100g","n":"Pimienta 100 g","c":"despensa","e":"🧺","u":"unid"},
{"id":"pinol_artesanal","n":"PINOL artesanal","c":"despensa","e":"🧺","u":"unid"},
{"id":"pina_colada","n":"Piña colada","c":"despensa","e":"🍍","u":"unid"},
{"id":"pinolillo","n":"Piñolillo","c":"despensa","e":"🧺","u":"kg"},
{"id":"pistacho","n":"Pistacho","c":"despensa","e":"🥜","u":"unid"},
{"id":"powerade","n":"Powerade","c":"despensa","e":"🧺","u":"unid"},
{"id":"prestino","n":"Prestiños","c":"despensa","e":"🧺","u":"unid"},
{"id":"pulpa","n":"Pulpa","c":"despensa","e":"🧃","u":"unid"},
{"id":"pulpa_fresquezza","n":"Pulpa Fresquezza","c":"despensa","e":"🧃","u":"unid"},
{"id":"pulpa_gigante","n":"Pulpa gigante","c":"despensa","e":"🧃","u":"unid"},
{"id":"pulpa_grande","n":"Pulpa grande","c":"despensa","e":"🧃","u":"unid"},
{"id":"pulpa_l_r","n":"Pulpa L.R","c":"despensa","e":"🧃","u":"unid"},
{"id":"pupusa","n":"Pupusa","c":"despensa","e":"🧺","u":"unid"},
{"id":"queque_banano_chispa_chocolate","n":"Queque Banano Chispas Chocolate","c":"despensa","e":"🍌","u":"unid"},
{"id":"queque_zanahoria_datile","n":"Queque Zanahoria-Datiles","c":"despensa","e":"🥕","u":"unid"},
{"id":"queso_tierno","n":"Queso tierno","c":"despensa","e":"🧀","u":"kg","f":"queso"},
{"id":"salsa_picante_don_jesu","n":"Salsa picante don jesus","c":"despensa","e":"🧺","u":"unid"},
{"id":"semilla_girasol","n":"Semilla girasol","c":"despensa","e":"🧺","u":"unid"},
{"id":"sobado","n":"Sobado","c":"despensa","e":"🧺","u":"unid"},
{"id":"tabasco","n":"Tabasco","c":"despensa","e":"🧺","u":"unid"},
{"id":"tapa_dulce","n":"Tapa dulce","c":"despensa","e":"🧺","u":"unid"},
{"id":"tartara","n":"Tartara","c":"despensa","e":"🧺","u":"unid"},
{"id":"tartara_grande","n":"Tártara grande","c":"despensa","e":"🧺","u":"caja"},
{"id":"tazita","n":"Tazitas","c":"despensa","e":"🧺","u":"unid"},
{"id":"tortilla_maiz_amarilla","n":"Tortilla maiz amarilla","c":"despensa","e":"🌽","u":"unid"},
{"id":"tortilla_maiz_blanca","n":"Tortilla maiz blanca","c":"despensa","e":"🌽","u":"unid"},
{"id":"tortilla_maiz_queso","n":"Tortilla maiz con queso","c":"despensa","e":"🌽","u":"unid"},
{"id":"tortilla_tostada","n":"Tortilla tostada","c":"despensa","e":"🫓","u":"unid"},
{"id":"tortilla","n":"Tortillas","c":"despensa","e":"🫓","u":"paquete","f":"tortillas"},
{"id":"tortillla_polaco_maiz","n":"Tortillla polaco maiz","c":"despensa","e":"🌽","u":"unid"},
{"id":"turron","n":"Turron","c":"despensa","e":"🧺","u":"unid"},
{"id":"vinagre","n":"Vinagre","c":"despensa","e":"🧺","u":"kg"},
{"id":"vinagre_manzana","n":"Vinagre de manzana","c":"despensa","e":"🍎","u":"kg"},
{"id":"yuplon","n":"Yuplon","c":"despensa","e":"🧺","u":"unid"}
];/*FIN LISTA*/
const FUERA=new Set(/*FUERA*/["botella 1 litro","botella 1l","chayote bolsa","coco completo","guiskil","guisquil","chile","chile normal","cebolla blanca","precio"]/*FIN FUERA*/);

const ALIAS=new Map();
LISTA.forEach(p=>{ALIAS.set(norm(p.n),p);(p.a||[]).forEach(a=>ALIAS.set(a,p));if(p.f)ALIAS.set('feria:'+p.f,p);});
const POR_ID=new Map(LISTA.map(p=>[p.id,p]));

function buscar(nombre){return ALIAS.get(norm(nombre))||null;}
function idDe(nombre){const p=buscar(nombre);return p?p.id:idDeNorm(norm(nombre));}
function deFeria(k){return ALIAS.get('feria:'+k)||null;}
function categoria(nombre){const p=buscar(nombre);return p?p.c:reglaCat(norm(nombre));}
function emoji(nombre,c){const p=buscar(nombre);if(p&&p.e)return p.e;return emojiDe(norm(nombre),c||categoria(nombre));}
function fuera(nombre){return FUERA.has(norm(nombre));}
// Clave del producto en La Feria: la de fábrica si La Feria ya lo tenía; si no, c_<id>
function claveFeria(id){const p=POR_ID.get(id);return p&&p.f?p.f:'c_'+id;}

// ── La nube: lo que Surtido tiene hoy y lo que publicó el POS de cada tienda ──
const LS_NUBE='aramo_cat_nube';
let NUBE=(()=>{try{return JSON.parse(localStorage.getItem(LS_NUBE))||{};}catch(e){return {};}})();
function surtidoNube(){return Array.isArray(NUBE.surtido)?NUBE.surtido:[];}
function posDe(suc){return (NUBE.pos&&NUBE.pos[suc]&&NUBE.pos[suc].productos)||{};}
function posFecha(suc){return (NUBE.pos&&NUBE.pos[suc]&&NUBE.pos[suc].t)||'';}
async function leer(ruta){
  const r=await fetch(SUPA_URL+'/rest/v1/'+ruta,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}});
  if(!r.ok)throw Object.assign(new Error('nube '+r.status),{status:r.status});
  return r.json();
}
let _cargando=null;
function cargar(){
  if(_cargando)return _cargando;
  _cargando=(async()=>{
    const nuevo={...NUBE};let cambio=false;
    try{
      const f=await leer('app_config?select=custom_providers&id=eq.main');
      const cp=(f&&f[0]&&f[0].custom_providers)||{},borr=(cp.Otros&&cp.Otros.borrados)||{},lista=[];
      Object.entries(cp).forEach(([prov,d])=>{if(!d||d.deleted)return;[...(d.products||[]),...(d.masterProducts||[])].forEach(p=>{if(p&&p.name)lista.push({n:String(p.name),u:p.unit||'',prov});});});
      nuevo.surtido=lista;nuevo.borrados=Object.keys(borr);cambio=true;
    }catch(e){}
    try{
      const f=await leer('aramo_catalogo_tienda?select=sucursal,productos,updated_at');
      nuevo.pos={};(f||[]).forEach(x=>{nuevo.pos[x.sucursal]={productos:x.productos||{},t:x.updated_at};});cambio=true;nuevo.sinTabla=false;
    }catch(e){if(e.status===404)nuevo.sinTabla=true;}
    if(cambio){nuevo.t=Date.now();NUBE=nuevo;try{localStorage.setItem(LS_NUBE,JSON.stringify(NUBE));}catch(e){}try{window.dispatchEvent(new Event('aramo-catalogo'));}catch(e){}}
    _cargando=null;return NUBE;
  })();
  return _cargando;
}
// Para pruebas y para el POS (que ya sabe lo suyo): poner a mano lo de la nube
function ponerNube(d){NUBE={...NUBE,...d};try{localStorage.setItem(LS_NUBE,JSON.stringify(NUBE));}catch(e){}try{window.dispatchEvent(new Event('aramo-catalogo'));}catch(e){}}

// ── Todos los productos de ARAMO (para una tienda): lista + Surtido de hoy + POS de esa tienda ──
// Devuelve [{id,n,c,e,u,f,pos}] sin repetir. `pos` es lo que el POS de esa tienda tiene (precio, unidad).
function todos(suc){
  const out=new Map(),borr=new Set((NUBE.borrados||[]).map(norm));
  const meter=(n,u,extra)=>{
    const k=norm(n);if(!k||FUERA.has(k)||borr.has(k))return null;
    const p=ALIAS.get(k),id=p?p.id:idDeNorm(k);
    if(out.has(id))return out.get(id);
    const c=p?p.c:reglaCat(k);
    const x={id,n:p?p.n:nombreBonito(n),c,e:p?p.e:emojiDe(k,c),u:p?p.u:unidadFeria(u),f:p?p.f||'':'',...(extra||{})};
    out.set(id,x);return x;
  };
  LISTA.forEach(p=>meter(p.n,p.u));
  surtidoNube().forEach(s=>meter(s.n,s.u));
  if(suc){
    Object.entries(posDe(suc)).forEach(([k,q])=>{
      if(!q||!q.n)return;
      const x=meter(q.n,q.u,{soloPos:true});
      if(x){x.pos=q;if(q.c&&CATS.includes(q.c)&&x.soloPos)x.c=q.c;}
    });
  }
  return [...out.values()];
}

window.ARAMO_CAT={CATS,CAT_NOMBRE,LISTA,norm,buscar,idDe,deFeria,categoria,emoji,fuera,claveFeria,unidadFeria,nombreBonito,
  reglaCat,cargar,ponerNube,surtidoNube,posDe,posFecha,todos,get sinTabla(){return !!NUBE.sinTabla;}};
})();
