/* ══════════════════════════════════════════════════════════════════════
   ARAMO Canasta — vitrina, recetas y ajustes de fábrica de la tienda.

   Los precios son de REFERENCIA (por kilo o por unidad). El total real se
   confirma al pesar en la tienda. Desde Mostrador → Vitrina se cambian
   precios, se ocultan productos o se marcan agotados; esos cambios viajan
   por la nube y pisan estos valores.
   ══════════════════════════════════════════════════════════════════════ */
window.ARAMO_CANASTA={
  version:'2026-10-04',

  pasillos:[
    {k:'top',n:'Lo más pedido',e:'⭐'},
    {k:'frutas',n:'Frutas',e:'🍎'},
    {k:'verduras',n:'Verduras',e:'🥬'},
    {k:'raices',n:'Raíces',e:'🥔'},
    {k:'hierbas',n:'Hierbas',e:'🌿'},
    {k:'despensa',n:'Despensa',e:'🥚'},
  ],

  // k: clave · n: nombre · e: ícono · c: pasillo · u: unidad · p: precio ₡ por unidad
  // s: paso (kg de medio en medio) · top: sale en "Lo más pedido" · mad: se puede elegir madurez
  productos:[
    {k:'tomate',n:'Tomate',e:'🍅',c:'verduras',u:'kg',p:1400,s:.5,top:1,mad:1},
    {k:'cebolla',n:'Cebolla',e:'🧅',c:'verduras',u:'kg',p:1200,s:.5,top:1},
    {k:'chile_dulce',n:'Chile dulce',e:'🫑',c:'verduras',u:'unid',p:300,s:1,top:1},
    {k:'zanahoria',n:'Zanahoria',e:'🥕',c:'verduras',u:'kg',p:900,s:.5,top:1},
    {k:'lechuga',n:'Lechuga americana',e:'🥬',c:'verduras',u:'unid',p:900,s:1},
    {k:'repollo',n:'Repollo',e:'🥬',c:'verduras',u:'unid',p:1100,s:1},
    {k:'pepino',n:'Pepino',e:'🥒',c:'verduras',u:'unid',p:350,s:1},
    {k:'brocoli',n:'Brócoli',e:'🥦',c:'verduras',u:'unid',p:1200,s:1},
    {k:'coliflor',n:'Coliflor',e:'🥦',c:'verduras',u:'unid',p:1300,s:1},
    {k:'chayote',n:'Chayote',e:'🟢',c:'verduras',u:'unid',p:300,s:1},
    {k:'vainica',n:'Vainica',e:'🫛',c:'verduras',u:'kg',p:1600,s:.5},
    {k:'elote',n:'Elote',e:'🌽',c:'verduras',u:'unid',p:400,s:1},
    {k:'ayote',n:'Ayote sazón',e:'🎃',c:'verduras',u:'kg',p:900,s:.5},
    {k:'zucchini',n:'Zucchini',e:'🥒',c:'verduras',u:'kg',p:1500,s:.5},
    {k:'apio',n:'Apio',e:'🥬',c:'verduras',u:'unid',p:800,s:1},
    {k:'espinaca',n:'Espinaca',e:'🥬',c:'verduras',u:'rollo',p:700,s:1},
    {k:'remolacha',n:'Remolacha',e:'🟣',c:'verduras',u:'kg',p:1000,s:.5},
    {k:'berenjena',n:'Berenjena',e:'🍆',c:'verduras',u:'unid',p:600,s:1},
    {k:'hongos',n:'Hongos',e:'🍄',c:'verduras',u:'paquete',p:1500,s:1},
    {k:'chile_picante',n:'Chile picante',e:'🌶️',c:'verduras',u:'bolsita',p:300,s:1},

    {k:'papa',n:'Papa',e:'🥔',c:'raices',u:'kg',p:1100,s:.5,top:1},
    {k:'yuca',n:'Yuca',e:'🍠',c:'raices',u:'kg',p:800,s:.5},
    {k:'camote',n:'Camote',e:'🍠',c:'raices',u:'kg',p:900,s:.5},
    {k:'tiquizque',n:'Tiquizque',e:'🍠',c:'raices',u:'kg',p:1300,s:.5},
    {k:'nampi',n:'Ñampí',e:'🍠',c:'raices',u:'kg',p:1400,s:.5},
    {k:'platano',n:'Plátano maduro',e:'🍌',c:'raices',u:'unid',p:300,s:1,top:1,mad:1},
    {k:'platano_verde',n:'Plátano verde',e:'🍌',c:'raices',u:'unid',p:300,s:1},
    {k:'jengibre',n:'Jengibre',e:'🫚',c:'raices',u:'kg',p:2600,s:.25},
    {k:'ajo',n:'Ajo',e:'🧄',c:'raices',u:'unid',p:350,s:1,top:1},

    {k:'banano',n:'Banano',e:'🍌',c:'frutas',u:'unid',p:100,s:1,top:1,mad:1},
    {k:'aguacate',n:'Aguacate',e:'🥑',c:'frutas',u:'unid',p:700,s:1,top:1,mad:1},
    {k:'limon',n:'Limón mandarina',e:'🍋',c:'frutas',u:'unid',p:100,s:1,top:1},
    {k:'papaya',n:'Papaya',e:'🧡',c:'frutas',u:'unid',p:1800,s:1,mad:1},
    {k:'pina',n:'Piña',e:'🍍',c:'frutas',u:'unid',p:1500,s:1,mad:1},
    {k:'sandia',n:'Sandía',e:'🍉',c:'frutas',u:'unid',p:2500,s:1},
    {k:'melon',n:'Melón',e:'🍈',c:'frutas',u:'unid',p:1600,s:1,mad:1},
    {k:'mango',n:'Mango',e:'🥭',c:'frutas',u:'unid',p:500,s:1,mad:1},
    {k:'manzana',n:'Manzana',e:'🍎',c:'frutas',u:'unid',p:450,s:1},
    {k:'pera',n:'Pera',e:'🍐',c:'frutas',u:'unid',p:550,s:1},
    {k:'naranja',n:'Naranja',e:'🍊',c:'frutas',u:'unid',p:150,s:1},
    {k:'mandarina',n:'Mandarina',e:'🍊',c:'frutas',u:'unid',p:200,s:1},
    {k:'fresa',n:'Fresa',e:'🍓',c:'frutas',u:'kg',p:3200,s:.5},
    {k:'uva',n:'Uva',e:'🍇',c:'frutas',u:'kg',p:3800,s:.5},
    {k:'mora',n:'Mora',e:'🫐',c:'frutas',u:'kg',p:2800,s:.5},
    {k:'maracuya',n:'Maracuyá',e:'🍈',c:'frutas',u:'unid',p:300,s:1},
    {k:'cas',n:'Cas',e:'🍈',c:'frutas',u:'kg',p:1500,s:.5},
    {k:'guanabana',n:'Guanábana',e:'🍈',c:'frutas',u:'kg',p:2500,s:.5},
    {k:'pipa',n:'Pipa',e:'🥥',c:'frutas',u:'unid',p:800,s:1},
    {k:'kiwi',n:'Kiwi',e:'🥝',c:'frutas',u:'unid',p:400,s:1},

    {k:'culantro',n:'Culantro',e:'🌿',c:'hierbas',u:'rollo',p:300,s:1,top:1},
    {k:'culantro_coyote',n:'Culantro coyote',e:'🌿',c:'hierbas',u:'rollo',p:300,s:1},
    {k:'cebollino',n:'Cebollino',e:'🌿',c:'hierbas',u:'rollo',p:350,s:1},
    {k:'perejil',n:'Perejil',e:'🌿',c:'hierbas',u:'rollo',p:400,s:1},
    {k:'albahaca',n:'Albahaca',e:'🌿',c:'hierbas',u:'rollo',p:600,s:1},
    {k:'hierbabuena',n:'Hierbabuena',e:'🌿',c:'hierbas',u:'rollo',p:400,s:1},
    {k:'oregano',n:'Orégano fresco',e:'🌿',c:'hierbas',u:'rollo',p:400,s:1},
    {k:'romero',n:'Romero',e:'🌿',c:'hierbas',u:'rollo',p:500,s:1},

    {k:'huevos',n:'Huevos (cartón 30)',e:'🥚',c:'despensa',u:'cartón',p:4200,s:1,top:1},
    {k:'frijoles',n:'Frijoles',e:'🫘',c:'despensa',u:'kg',p:1900,s:.5},
    {k:'arroz',n:'Arroz',e:'🍚',c:'despensa',u:'kg',p:1100,s:1},
    {k:'miel',n:'Miel de abeja',e:'🍯',c:'despensa',u:'frasco',p:3500,s:1},
    {k:'mani',n:'Maní',e:'🥜',c:'despensa',u:'bolsa',p:1200,s:1},
    {k:'tortillas',n:'Tortillas',e:'🫓',c:'despensa',u:'paquete',p:900,s:1},
    {k:'queso',n:'Queso tierno',e:'🧀',c:'despensa',u:'kg',p:5200,s:.5},
    {k:'agua_pipa',n:'Agua de pipa',e:'💧',c:'despensa',u:'botella',p:1500,s:1},
  ],

  // Recetas del Taller: cantidades para 4 personas; se escalan solas.
  recetas:[
    {k:'olla',n:'Olla de carne',e:'🍲',color:'#c46b2b',desc:'Las verduras completas, vos ponés la carne.',
      items:[['yuca',1],['papa',1],['elote',4],['chayote',2],['zanahoria',.5],['ayote',.5],['platano_verde',2],['tiquizque',.5],['culantro',1]]},
    {k:'picadillo',n:'Picadillo de papa',e:'🥔',color:'#a67c2d',desc:'Clásico tico para acompañar o rellenar tortillas.',
      items:[['papa',1.5],['chile_dulce',1],['cebolla',.5],['culantro',1],['ajo',1]]},
    {k:'pico',n:'Pico de gallo',e:'🍅',color:'#d1452f',desc:'Fresco, rápido y para todo.',
      items:[['tomate',1],['cebolla',.5],['culantro',1],['limon',4],['chile_dulce',1]]},
    {k:'guaca',n:'Guacamole',e:'🥑',color:'#4e8a2f',desc:'Aguacates en su punto, listos para hoy.',
      items:[['aguacate',4],['tomate',.5],['cebolla',.5],['limon',3],['culantro',1]]},
    {k:'ensalada',n:'Ensalada fresca',e:'🥗',color:'#3f9b5f',desc:'Para la semana: crujiente y de colores.',
      items:[['lechuga',1],['tomate',.5],['pepino',2],['zanahoria',.5],['limon',2]]},
    {k:'sopa',n:'Sopa de verduras',e:'🥣',color:'#c9932c',desc:'Caliente, rendidora y con lo de la huerta.',
      items:[['zanahoria',.5],['papa',1],['chayote',2],['apio',1],['elote',2],['vainica',.5],['cebolla',.5],['culantro',1]]},
    {k:'pinto',n:'Gallo pinto',e:'🍳',color:'#7a4b2a',desc:'La base de la semana: sofrito listo.',
      items:[['frijoles',1],['cebolla',.5],['chile_dulce',2],['culantro',1],['huevos',1]]},
    {k:'frutas',n:'Frutas de la semana',e:'🧺',color:'#d0782a',desc:'Una de cada para merendar toda la semana.',
      items:[['banano',7],['papaya',1],['pina',1],['manzana',4],['naranja',6]]},
    {k:'batidos',n:'Batidos',e:'🥤',color:'#c2306b',desc:'Para 7 mañanas de batido.',
      items:[['fresa',.5],['banano',6],['papaya',1],['mora',.5],['pina',1]]},
  ],

  // Ajustes de fábrica. Mostrador → Ajustes los cambia para todos.
  tienda:{
    nombre:'ARAMO',
    whatsapp:'',            // número de la tienda (8 dígitos) para avisos y comprobantes
    sinpe:{numero:'',nombre:''},
    linkTarjeta:'',         // opcional: link de pago con tarjeta (Tilopay, ONVO, etc.)
    alistadoMin:40,         // minutos que tarda en estar lista
    alCarro:true,           // ofrecer "me lo llevan al carro"
    envio:true,             // ofrecer envío a domicilio con Uber (el cliente comparte su ubicación)
    sucursales:[
      {k:'moravia',n:'ARAMO',zona:'Moravia',mapa:'ARAMO verdulería Moravia',abre:'07:00',cierra:'19:00',activa:true},
      {k:'angeles',n:'LASR',zona:'Los Ángeles',mapa:'LASR verdulería Los Ángeles',abre:'07:00',cierra:'19:00',activa:true},
    ],
    precios:{},   // k → precio que pisa la referencia
    ocultos:[],   // k que no se muestran
    agotados:[],  // k que se ven pero no se pueden pedir hoy
  },
};
