router.post('/login', validate(loginSchema), async(req, res, next) => {
    try {
        const { password, employeeNumber } = req.body;
        const meta = reqMeta(req);

        const emp = String(employeeNumber || '').trim();
        if (!emp) return res.status(400).json({ message: 'Número de empleado requerido' });

        const user = await User.findOne({ employeeNumber: emp });
        if (!user || !user.isActive) {
            await AuthLog.create({ user: user ? user._id : null, email: '', event: 'LOGIN_FAIL', ...meta });
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            await AuthLog.create({ user: user._id, email: user.email || '', event: 'LOGIN_FAIL', ...meta });
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ sub: user._id.toString(), role: user.role },
            process.env.JWT_SECRET, { expiresIn: '12h' }
        );

        await AuthLog.create({ user: user._id, email: user.email || '', event: 'LOGIN_SUCCESS', ...meta });

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email || '',
                fullName: user.fullName,
                role: user.role,
                position: user.position,
                employeeNumber: user.employeeNumber
            }
        });
    } catch (e) { next(e); }
});