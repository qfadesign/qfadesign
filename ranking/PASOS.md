# Activar el ranking (una sola vez)

1. Crear cuenta gratis en https://supabase.com y un proyecto nuevo (elegí la región más cercana, por ejemplo São Paulo).
2. En el proyecto: **SQL Editor → New query**, pegar todo `ranking/supabase.sql` y apretar **Run**.
3. En **Project Settings → API** copiar:
   - **Project URL**
   - **clave pública (anon o publishable)** (está pensada para ir en el código; la seguridad la dan las funciones del SQL)
4. Abrir `js/ranking-config.js` y reemplazar los dos valores de ejemplo.
5. Subir a GitHub los archivos modificados. Jugar una partida y revisar que aparezca el ranking al terminar.

Mientras el archivo de config tenga el texto de ejemplo, el ranking queda apagado y los juegos funcionan igual que antes.

## Cómo funciona
- El jugador elige un apodo y, si quiere, un código de 4 números (opcional); el sistema le asigna un número correlativo (`Facu#7`: el primer jugador es #1, el segundo #2…; hay que correr `ranking/numeros.sql` una vez).
- Con apodo + número + código se arma un secreto que queda guardado en su navegador. Solo quien lo tiene puede actualizar los puntajes de ese jugador.
- Se guarda únicamente el mejor puntaje por jugador, juego y modo (el ranking es por dificultad).
- Si borra los datos del navegador o juega desde otro dispositivo, toca "Ya jugué antes" y pone apodo, número y código para recuperar su nombre (requiere haber corrido `ranking/recuperar.sql` una vez).
- Quien ya jugó sin código ve "Ponerle un código a mi nombre" mientras tenga el nombre guardado en ese navegador (usa la función `poner_codigo` de `recuperar.sql`).
- Dentro del navegador de Instagram/Facebook se muestra un aviso para abrir la página en Chrome o Safari, porque ahí lo guardado no se comparte.
- Los nombres creados sin código no se pueden recuperar en otro dispositivo, y los creados antes de este cambio tampoco.


## Para ajustar
- Puntajes máximos y modos permitidos: función `enviar_puntaje` en `supabase.sql` (si cambiás rondas o puntos de un juego, cambiá el máximo ahí).
- Lista de apodos prohibidos: misma función. Para sacar un puntaje o jugador trucho: Supabase → Table Editor → `players` / `scores`.
