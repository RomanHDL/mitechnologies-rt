const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization || '';
        const [type, token] = header.split(' ');

        if (type !== 'Bearer' || !token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ message: 'Missing JWT_SECRET in env' });
        }

        const payload = jwt.verify(token, secret);
        req.user = payload; // { id, role, ... } según como lo generes en login
        return next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        const role = req.user?.role;
        if (!role || !roles.includes(role)) {
            return res.status(403).json({ message: 'Forbidden (role)' });
        }
        next();
    };
}

module.exports = { requireAuth, requireRole };