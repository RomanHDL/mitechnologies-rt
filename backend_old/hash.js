const bcrypt = require('bcrypt');

async function generar() {
    const password = '121101'; // ← aquí pon la contraseña que tú quieres
    const hash = await bcrypt.hash(password, 10);
    console.log(hash);
}

generar();