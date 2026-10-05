/* ══════════════════════════════════════════════════════════════════════
   ARAMO Taller — vitrina, recetario y ajustes de fábrica de la tienda.

   Los precios son de REFERENCIA (por kilo o por unidad). El total real
   se calcula con lo que pesa cada producto al alistarlo. Desde Mostrador
   → Vitrina se cambian precio, unidad, nombre y descripción, se agregan
   productos y se ocultan o marcan agotados; esos cambios pisan estos
   valores en todos lados (Taller, recetas, Mostrador y Caja).
   ══════════════════════════════════════════════════════════════════════ */
window.ARAMO_CANASTA={
  version:'2026-10-04-v3',

  pasillos:[
    {k:'top',n:'Lo más pedido',e:'⭐'},
    {k:'frutas',n:'Frutas',e:'🍎'},
    {k:'verduras',n:'Verduras',e:'🥬'},
    {k:'raices',n:'Raíces',e:'🥔'},
    {k:'hierbas',n:'Hierbas',e:'🌿'},
    {k:'despensa',n:'Despensa',e:'🥚'},
  ],

  // k clave · n nombre · d qué es exactamente · e ícono · c pasillo · u unidad · p precio ₡
  // s paso (kg de medio en medio) · top sale en "Lo más pedido" · mad se elige madurez
  productos:[
    {k:'tomate',n:'Tomate',d:'Tomate de ensalada, rojo y firme',e:'🍅',c:'verduras',u:'kg',p:1400,s:.5,top:1,mad:1},
    {k:'cebolla',n:'Cebolla',d:'Cebolla blanca mediana',e:'🧅',c:'verduras',u:'kg',p:1200,s:.5,top:1},
    {k:'chile_dulce',n:'Chile dulce',d:'Chile dulce mediano, verde o rojo',e:'🫑',c:'verduras',u:'unid',p:300,s:1,top:1},
    {k:'zanahoria',n:'Zanahoria',d:'Zanahoria mediana, lavada',e:'🥕',c:'verduras',u:'kg',p:900,s:.5,top:1},
    {k:'lechuga',n:'Lechuga americana',d:'Cabeza de lechuga americana',e:'🥬',c:'verduras',u:'unid',p:900,s:1},
    {k:'repollo',n:'Repollo',d:'Repollo verde entero',e:'🥬',c:'verduras',u:'unid',p:1100,s:1},
    {k:'pepino',n:'Pepino',d:'Pepino verde mediano',e:'🥒',c:'verduras',u:'unid',p:350,s:1},
    {k:'brocoli',n:'Brócoli',d:'Cabeza de brócoli',e:'🥦',c:'verduras',u:'unid',p:1200,s:1},
    {k:'coliflor',n:'Coliflor',d:'Cabeza de coliflor',e:'🥦',c:'verduras',u:'unid',p:1300,s:1},
    {k:'chayote',n:'Chayote',d:'Chayote tierno, liso',e:'🟢',c:'verduras',u:'unid',p:300,s:1},
    {k:'vainica',n:'Vainica',d:'Vainica tierna, a granel',e:'🫛',c:'verduras',u:'kg',p:1600,s:.5},
    {k:'elote',n:'Elote',d:'Elote tierno con tusa',e:'🌽',c:'verduras',u:'unid',p:400,s:1},
    {k:'ayote',n:'Ayote sazón',d:'Ayote maduro, por kilo (se parte)',e:'🎃',c:'verduras',u:'kg',p:900,s:.5},
    {k:'zucchini',n:'Zucchini',d:'Zucchini verde',e:'🥒',c:'verduras',u:'kg',p:1500,s:.5},
    {k:'apio',n:'Apio',d:'Mata de apio completa',e:'🥬',c:'verduras',u:'unid',p:800,s:1},
    {k:'espinaca',n:'Espinaca',d:'Rollo de espinaca fresca',e:'🥬',c:'verduras',u:'rollo',p:700,s:1},
    {k:'remolacha',n:'Remolacha',d:'Remolacha mediana',e:'🟣',c:'verduras',u:'kg',p:1000,s:.5},
    {k:'berenjena',n:'Berenjena',d:'Berenjena morada mediana',e:'🍆',c:'verduras',u:'unid',p:600,s:1},
    {k:'hongos',n:'Hongos',d:'Bandeja de hongos blancos (≈227 g)',e:'🍄',c:'verduras',u:'paquete',p:1500,s:1},
    {k:'chile_picante',n:'Chile picante',d:'Bolsita de chile picante',e:'🌶️',c:'verduras',u:'bolsita',p:300,s:1},
    {k:'rabano',n:'Rábano',d:'Rollo de rábanos rojos',e:'🔴',c:'verduras',u:'rollo',p:500,s:1},

    {k:'papa',n:'Papa',d:'Papa blanca para cocinar',e:'🥔',c:'raices',u:'kg',p:1100,s:.5,top:1},
    {k:'yuca',n:'Yuca',d:'Yuca fresca, parafinada',e:'🍠',c:'raices',u:'kg',p:800,s:.5},
    {k:'camote',n:'Camote',d:'Camote morado',e:'🍠',c:'raices',u:'kg',p:900,s:.5},
    {k:'tiquizque',n:'Tiquizque',d:'Tiquizque blanco',e:'🍠',c:'raices',u:'kg',p:1300,s:.5},
    {k:'nampi',n:'Ñampí',d:'Ñampí fresco',e:'🍠',c:'raices',u:'kg',p:1400,s:.5},
    {k:'arracache',n:'Arracache',d:'Arracache fresco para picadillo',e:'🍠',c:'raices',u:'kg',p:2200,s:.5},
    {k:'platano',n:'Plátano maduro',d:'Plátano amarillo para freír',e:'🍌',c:'raices',u:'unid',p:300,s:1,top:1,mad:1},
    {k:'platano_verde',n:'Plátano verde',d:'Plátano verde para patacones u olla',e:'🍌',c:'raices',u:'unid',p:300,s:1},
    {k:'jengibre',n:'Jengibre',d:'Raíz de jengibre fresca',e:'🫚',c:'raices',u:'kg',p:2600,s:.25},
    {k:'ajo',n:'Ajo',d:'Cabeza de ajo',e:'🧄',c:'raices',u:'unid',p:350,s:1,top:1},

    {k:'banano',n:'Banano',d:'Banano criollo, por unidad',e:'🍌',c:'frutas',u:'unid',p:100,s:1,top:1,mad:1},
    {k:'aguacate',n:'Aguacate',d:'Aguacate Hass mediano',e:'🥑',c:'frutas',u:'unid',p:700,s:1,top:1,mad:1},
    {k:'limon',n:'Limón mandarina',d:'Limón mandarina jugoso',e:'🍋',c:'frutas',u:'unid',p:100,s:1,top:1},
    {k:'papaya',n:'Papaya',d:'Papaya entera mediana (≈1,5 kg)',e:'🧡',c:'frutas',u:'unid',p:1800,s:1,mad:1},
    {k:'pina',n:'Piña',d:'Piña dorada entera',e:'🍍',c:'frutas',u:'unid',p:1500,s:1,mad:1},
    {k:'sandia',n:'Sandía',d:'Sandía entera mediana',e:'🍉',c:'frutas',u:'unid',p:2500,s:1},
    {k:'melon',n:'Melón',d:'Melón cantaloupe entero',e:'🍈',c:'frutas',u:'unid',p:1600,s:1,mad:1},
    {k:'mango',n:'Mango',d:'Mango maduro mediano',e:'🥭',c:'frutas',u:'unid',p:500,s:1,mad:1},
    {k:'manzana',n:'Manzana',d:'Manzana roja importada',e:'🍎',c:'frutas',u:'unid',p:450,s:1},
    {k:'pera',n:'Pera',d:'Pera verde importada',e:'🍐',c:'frutas',u:'unid',p:550,s:1},
    {k:'naranja',n:'Naranja',d:'Naranja para jugo',e:'🍊',c:'frutas',u:'unid',p:150,s:1},
    {k:'mandarina',n:'Mandarina',d:'Mandarina dulce',e:'🍊',c:'frutas',u:'unid',p:200,s:1},
    {k:'fresa',n:'Fresa',d:'Fresa fresca, a granel',e:'🍓',c:'frutas',u:'kg',p:3200,s:.5},
    {k:'uva',n:'Uva',d:'Uva roja sin semilla',e:'🍇',c:'frutas',u:'kg',p:3800,s:.5},
    {k:'mora',n:'Mora',d:'Mora fresca, a granel',e:'🫐',c:'frutas',u:'kg',p:2800,s:.5},
    {k:'maracuya',n:'Maracuyá',d:'Maracuyá amarillo',e:'🍈',c:'frutas',u:'unid',p:300,s:1},
    {k:'cas',n:'Cas',d:'Cas para fresco',e:'🍈',c:'frutas',u:'kg',p:1500,s:.5},
    {k:'guanabana',n:'Guanábana',d:'Guanábana madura, por kilo',e:'🍈',c:'frutas',u:'kg',p:2500,s:.5},
    {k:'pipa',n:'Pipa',d:'Pipa fría, lista para tomar',e:'🥥',c:'frutas',u:'unid',p:800,s:1},
    {k:'kiwi',n:'Kiwi',d:'Kiwi verde',e:'🥝',c:'frutas',u:'unid',p:400,s:1},

    {k:'culantro',n:'Culantro',d:'Rollo de culantro castilla',e:'🌿',c:'hierbas',u:'rollo',p:300,s:1,top:1},
    {k:'culantro_coyote',n:'Culantro coyote',d:'Rollo de culantro de hoja ancha',e:'🌿',c:'hierbas',u:'rollo',p:300,s:1},
    {k:'cebollino',n:'Cebollino',d:'Rollo de cebollino',e:'🌿',c:'hierbas',u:'rollo',p:350,s:1},
    {k:'perejil',n:'Perejil',d:'Rollo de perejil crespo',e:'🌿',c:'hierbas',u:'rollo',p:400,s:1},
    {k:'albahaca',n:'Albahaca',d:'Rollo de albahaca fresca',e:'🌿',c:'hierbas',u:'rollo',p:600,s:1},
    {k:'hierbabuena',n:'Hierbabuena',d:'Rollo de hierbabuena',e:'🌿',c:'hierbas',u:'rollo',p:400,s:1},
    {k:'oregano',n:'Orégano fresco',d:'Rollo de orégano',e:'🌿',c:'hierbas',u:'rollo',p:400,s:1},
    {k:'romero',n:'Romero',d:'Rollo de romero',e:'🌿',c:'hierbas',u:'rollo',p:500,s:1},

    {k:'huevos',n:'Huevos (cartón 30)',d:'Cartón de 30 huevos medianos',e:'🥚',c:'despensa',u:'cartón',p:4200,s:1,top:1},
    {k:'frijoles',n:'Frijoles',d:'Frijol negro, a granel',e:'🫘',c:'despensa',u:'kg',p:1900,s:.5},
    {k:'arroz',n:'Arroz',d:'Arroz blanco 99 %, a granel',e:'🍚',c:'despensa',u:'kg',p:1100,s:1},
    {k:'miel',n:'Miel de abeja',d:'Frasco de miel de abeja (≈350 g)',e:'🍯',c:'despensa',u:'frasco',p:3500,s:1},
    {k:'mani',n:'Maní',d:'Bolsa de maní tostado (≈200 g)',e:'🥜',c:'despensa',u:'bolsa',p:1200,s:1},
    {k:'tortillas',n:'Tortillas',d:'Paquete de 10 tortillas de maíz',e:'🫓',c:'despensa',u:'paquete',p:900,s:1},
    {k:'queso',n:'Queso tierno',d:'Queso tierno fresco, por kilo',e:'🧀',c:'despensa',u:'kg',p:5200,s:.5},
    {k:'agua_pipa',n:'Agua de pipa',d:'Botella de agua de pipa (1 L)',e:'💧',c:'despensa',u:'botella',p:1500,s:1},
  ],

  categoriasRecetas:[
    {k:'tico',n:'Almuerzo tico',e:'🇨🇷'},
    {k:'sano',n:'Saludable',e:'🥗'},
    {k:'desayuno',n:'Desayuno',e:'🍳'},
    {k:'bebidas',n:'Bebidas',e:'🥤'},
    {k:'picar',n:'Para picar',e:'🥑'},
    {k:'semana',n:'Para la semana',e:'🗓️'},
  ],

  // Recetario: cantidades para 4 personas; se escalan solas por personas.
  recetas:[
    {k:'olla',c:'tico',n:'Olla de carne',e:'🍲',desc:'Las verduras completas, vos ponés la carne.',items:[['yuca',1],['papa',1],['elote',4],['chayote',2],['zanahoria',.5],['ayote',.5],['platano_verde',2],['tiquizque',.5],['culantro',1]]},
    {k:'picadillo',c:'tico',n:'Picadillo de papa',e:'🥔',desc:'Clásico para acompañar o rellenar tortillas.',items:[['papa',1.5],['chile_dulce',1],['cebolla',.5],['culantro',1],['ajo',1]]},
    {k:'picarracache',c:'tico',n:'Picadillo de arracache',e:'🍠',desc:'El de la abuela, con su sofrito.',items:[['arracache',1],['chile_dulce',1],['cebolla',.5],['ajo',1],['culantro',1]]},
    {k:'picchayote',c:'tico',n:'Picadillo de chayote',e:'🟢',desc:'Liviano, con elote dulce.',items:[['chayote',4],['elote',1],['cebolla',.5],['chile_dulce',1],['culantro',1]]},
    {k:'sopa',c:'tico',n:'Sopa de verduras',e:'🥣',desc:'Caliente, rendidora y con lo de la huerta.',items:[['zanahoria',.5],['papa',1],['chayote',2],['apio',1],['elote',2],['vainica',.5],['cebolla',.5],['culantro',1]]},
    {k:'vigoron',c:'tico',n:'Vigorón (sin chicharrón)',e:'🥬',desc:'Yuca, ensalada de repollo y limón.',items:[['yuca',1],['repollo',1],['tomate',.5],['limon',3]]},
    {k:'chimichurri',c:'picar',n:'Chimichurri tico',e:'🍅',desc:'Para carne asada, frijoles o chifrijo.',items:[['tomate',.5],['cebolla',.5],['chile_dulce',1],['culantro',1],['limon',4]]},
    {k:'pico',c:'picar',n:'Pico de gallo',e:'🌶️',desc:'Fresco, rápido y para todo.',items:[['tomate',1],['cebolla',.5],['culantro',1],['limon',4],['chile_dulce',1]]},
    {k:'guaca',c:'picar',n:'Guacamole',e:'🥑',desc:'Aguacates en su punto, listos para hoy.',items:[['aguacate',4],['tomate',.5],['cebolla',.5],['limon',3],['culantro',1]]},
    {k:'cevmango',c:'picar',n:'Ceviche de mango',e:'🥭',desc:'Dulce, ácido y sin pescado.',items:[['mango',3],['cebolla',.5],['culantro',1],['limon',6],['chile_dulce',1]]},
    {k:'patacones',c:'picar',n:'Patacones con frijolitos',e:'🍌',desc:'Plátano verde para patacones y su pico.',items:[['platano_verde',4],['frijoles',.5],['tomate',.5],['cebolla',.5],['culantro',1]]},
    {k:'ensalada',c:'sano',n:'Ensalada fresca',e:'🥗',desc:'Crujiente y de colores.',items:[['lechuga',1],['tomate',.5],['pepino',2],['zanahoria',.5],['limon',2]]},
    {k:'repollo',c:'sano',n:'Ensalada de repollo',e:'🥬',desc:'La de todos los casados.',items:[['repollo',1],['tomate',.5],['zanahoria',.5],['limon',2]]},
    {k:'caprese',c:'sano',n:'Ensalada caprese',e:'🧀',desc:'Tomate, queso tierno y albahaca.',items:[['tomate',1],['queso',.5],['albahaca',1]]},
    {k:'crema',c:'sano',n:'Crema de ayote',e:'🎃',desc:'Suavecita y reconfortante.',items:[['ayote',1],['papa',.5],['cebolla',.5],['ajo',1]]},
    {k:'fajitas',c:'sano',n:'Fajitas de vegetales',e:'🌮',desc:'Chiles, hongos y aguacate para rellenar.',items:[['chile_dulce',3],['cebolla',.5],['hongos',1],['zucchini',.5],['tortillas',1],['aguacate',2]]},
    {k:'pinto',c:'desayuno',n:'Gallo pinto',e:'🍳',desc:'La base de la semana: sofrito listo.',items:[['frijoles',1],['cebolla',.5],['chile_dulce',2],['culantro',1],['huevos',1]]},
    {k:'desayuno',c:'desayuno',n:'Desayuno completo',e:'🍽️',desc:'Huevos, maduro, aguacate y tortillas.',items:[['huevos',1],['platano',2],['aguacate',1],['tomate',.5],['tortillas',1]]},
    {k:'ensfrutas',c:'desayuno',n:'Ensalada de frutas',e:'🍓',desc:'Para un desayuno fresco.',items:[['papaya',1],['banano',4],['manzana',2],['fresa',.5],['mango',2]]},
    {k:'batidos',c:'bebidas',n:'Batidos',e:'🥤',desc:'Para 7 mañanas de batido.',items:[['fresa',.5],['banano',6],['papaya',1],['mora',.5],['pina',1]]},
    {k:'jugo',c:'bebidas',n:'Jugo de naranja',e:'🍊',desc:'Recién exprimido para todos.',items:[['naranja',16]]},
    {k:'limonada',c:'bebidas',n:'Limonada con hierbabuena',e:'🍋',desc:'Bien fría, con miel.',items:[['limon',12],['hierbabuena',1],['miel',1]]},
    {k:'sandia',c:'bebidas',n:'Fresco de sandía',e:'🍉',desc:'Una sandía, limón y hierbabuena.',items:[['sandia',1],['limon',2],['hierbabuena',1]]},
    {k:'frutas',c:'semana',n:'Frutas de la semana',e:'🧺',desc:'Una de cada para merendar toda la semana.',items:[['banano',7],['papaya',1],['pina',1],['manzana',4],['naranja',6]]},
    {k:'pomodoro',c:'semana',n:'Pasta pomodoro',e:'🍝',desc:'Salsa de tomate casera con albahaca.',items:[['tomate',1.5],['cebolla',.5],['ajo',1],['albahaca',1]]},
    {k:'horno',c:'semana',n:'Papas al horno',e:'🥔',desc:'Con romero y ajo, para acompañar.',items:[['papa',1.5],['romero',1],['ajo',1]]},
  ],

  // Ajustes de fábrica. Mostrador → Ajustes los cambia para todos.
  tienda:{
    nombre:'ARAMO',
    whatsapp:'',            // WhatsApp general (si una tienda no tiene el suyo)
    sinpe:{numero:'',nombre:''},
    linkTarjeta:'',         // opcional: link de pago con tarjeta (Tilopay, ONVO, etc.)
    alistadoMin:40,         // minutos que tarda en estar lista
    alCarro:true,           // ofrecer "me lo llevan al carro"
    envio:true,             // ofrecer envío a domicilio con Uber
    margen:35,              // % sobre el costo de Surtido para el precio automático
    sucursales:[
      {k:'moravia',n:'ARAMO',zona:'Moravia',mapa:'ARAMO verdulería Moravia',abre:'07:00',cierra:'19:00',activa:true,whatsapp:''},
      {k:'angeles',n:'LASR',zona:'Los Ángeles',mapa:'LASR verdulería Los Ángeles',abre:'07:00',cierra:'19:00',activa:true,whatsapp:''},
    ],
    precios:{},   // k → precio que pisa la referencia
    prods:{},     // k → cambios de nombre, descripción, unidad, paso, ícono, pasillo, auto
    nuevos:[],    // productos agregados por la tienda
    ocultos:[],   // k que no se muestran
    agotados:[],  // k que se ven pero no se pueden pedir hoy
    recetas:[],   // recetas creadas por la tienda
  },
};
