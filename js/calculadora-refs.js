/* qfadesign — referencias de mercado de la calculadora (justificación de los valores).
   Acá se editan las FUENTES y los rangos con los que se compara cada servicio. Los precios propios siguen en js/calculadora.js.
   - mon: "ARS" o "USD" (los USD se pasan a pesos con el dólar MEP del día).
   - p: periodicidad que se muestra junto al rango ("por mes", "por hora").
   - minimo: true  → la fuente publica una "banda mínima": estar por encima es lo esperable.
   - mas: true     → el máximo es abierto ("5.000 o más").
   - Si min y max son iguales, es un valor puntual (un ejemplo) y se muestra la diferencia en %.
   Los servicios que no figuran en "servicios" no tienen una tarifa comparable relevada: el PDF lo aclara y usa las tarifas por hora. */
window.QFA_REFS = {
  consulta: "07/10/2026",
  fuentes: {
    s1: {
      t: "Tarifario sugerido para trabajos de periodismo y comunicación (actualización agosto 2026)",
      o: "FCEDU-UNER y Sindicato Entrerriano de Trabajadores de Prensa y Comunicación",
      u: "https://www.fcedu.uner.edu.ar/wp-content/uploads/2026/08/Tarifario-Agosto.pdf",
      n: "Valores en pesos, pensados como banda mínima para trabajo independiente en Entre Ríos."
    },
    s2: {
      t: "Cuánta plata se puede ganar por mes trabajando como community manager en Argentina",
      o: "iProfesional (cita datos de la agencia Imactions)",
      u: "https://www.iprofesional.com/management/430831-que-sueldo-gana-community-manager-argentina-junio-2025",
      n: "Community managers freelance en Argentina: entre USD 325 y 750 por mes, y entre USD 20 y 60 la hora en proyectos puntuales."
    },
    s3: {
      t: "¿Cuánto cuesta crear una página web en Argentina?",
      o: "GoDaddy Latinoamérica",
      u: "https://www.godaddy.com/resources/latam/crearweb/cuanto-cuesta-crear-pagina-en-argentina",
      n: "Web corporativa profesional: entre USD 1.500 y 5.000."
    },
    s4: {
      t: "How Much Does a Landing Page Cost in 2026?",
      o: "LanderLab (referencia internacional, en dólares)",
      u: "https://landerlab.io/blog/how-much-does-a-landing-page-cost",
      n: "Landing básica con un freelance: USD 500 a 1.500. Landing programada a medida: USD 2.500 a 5.000 o más."
    },
    s5: {
      t: "How Much Does It Cost to Hire a Branding Professional in 2026?",
      o: "Fiverr (referencia internacional, en dólares)",
      u: "https://fiverr.com/resources/guides/costs/branding-professional",
      n: "Servicios de branding en marketplace: entre USD 65 y 2.010."
    },
    s6: {
      t: "¿Cuánto cobra un diseñador gráfico freelance?",
      o: "polisura.edu.co (referencia en dólares)",
      u: "https://www.polisura.edu.co/?p=35531",
      n: "Identidad visual completa (logotipo, paleta, tipografía y aplicaciones): entre USD 500 y 5.000."
    },
    s7: {
      t: "Precio de una landing page explicado",
      o: "Learn Shopify / GemPages (referencia internacional)",
      u: "https://gempages.net/es/blogs/shopify/landing-page-cost",
      n: "Entregas en menos de una semana: entre 20 % y 50 % más que la tarifa estándar. Dato de landing pages, tomado como orientación general."
    }
  },
  /* Tarifas por hora: se usan cuando un servicio no tiene una referencia directa */
  porHora: [
    { f: "s1", min: 20650, max: 25350, mon: "ARS", minimo: true, p: "por hora", l: "Diseño, asesoramiento y consultoría" },
    { f: "s2", min: 20, max: 60, mon: "USD", p: "por hora", l: "Freelance en proyectos puntuales" }
  ],
  servicios: {
    "branding-emprendedores": [{ f: "s5", min: 65, max: 2010, mon: "USD", l: "Servicios de branding en marketplace" }],
    "rediseno-imagen": [{ f: "s5", min: 65, max: 2010, mon: "USD", l: "Servicios de branding en marketplace" }],
    "identidad-completa": [{ f: "s6", min: 500, max: 5000, mon: "USD", l: "Identidad visual completa con un freelance" }],
    "pieza-unica": [{ f: "s1", min: 40000, max: 40000, mon: "ARS", l: "Ejemplo de flyer del tarifario" }],
    "pitch-deck": [{ f: "s1", min: 276750, max: 483000, mon: "ARS", minimo: true, l: "Referencia análoga: 15 páginas de diseño editorial ($ 18.450 la simple, $ 32.200 la compuesta)" }],
    "cm-basica": [
      { f: "s1", min: 172400, max: 229800, mon: "ARS", minimo: true, p: "por mes", l: "Gestión mensual de una red social" },
      { f: "s2", min: 325, max: 750, mon: "USD", p: "por mes", l: "Community manager freelance en Argentina" }
    ],
    "cm-estandar": [
      { f: "s1", min: 172400, max: 229800, mon: "ARS", minimo: true, p: "por mes", l: "Gestión mensual de una red social" },
      { f: "s2", min: 325, max: 750, mon: "USD", p: "por mes", l: "Community manager freelance en Argentina" }
    ],
    "cm-intensiva": [
      { f: "s1", min: 172400, max: 229800, mon: "ARS", minimo: true, p: "por mes", l: "Gestión mensual de una red social" },
      { f: "s2", min: 325, max: 750, mon: "USD", p: "por mes", l: "Community manager freelance en Argentina" }
    ],
    "landing": [{ f: "s4", min: 500, max: 1500, mon: "USD", l: "Landing básica con un freelance" }],
    "landing-codigo": [{ f: "s4", min: 2500, max: 5000, mas: true, mon: "USD", l: "Landing programada a medida" }],
    "web-codigo": [{ f: "s3", min: 1500, max: 5000, mon: "USD", l: "Web corporativa profesional" }],
    "consultoria": [
      { f: "s1", min: 20650, max: 25350, mon: "ARS", minimo: true, p: "por hora", l: "Diseño, asesoramiento y consultoría" },
      { f: "s2", min: 20, max: 60, mon: "USD", p: "por hora", l: "Tarifa horaria freelance" }
    ]
  },
  /* Recargo por entrega urgente, en % */
  urgente: [{ f: "s7", min: 20, max: 50, mon: "%", l: "Recargo por entregar en menos de una semana" }],
  /* Por qué cambia el valor según el tipo de cliente */
  clientes: {
    "emprendimiento": "Es el valor base. Corresponde a proyectos que están arrancando o que no tienen fines de lucro, con un alcance y una estructura más acotados.",
    "pyme": "Coeficiente ×1,4. Un equipo chico y una marca que ya camina suman más puntos de contacto, más instancias de revisión y piezas con mayor alcance.",
    "empresa": "Coeficiente ×2. Varias áreas involucradas y una marca con más estructura implican más coordinación, más aplicaciones y un alcance de uso mayor."
  }
};
