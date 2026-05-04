import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as userModel from '../models/userModel.js';
import { isValidEmail, isStrongPassword, requireNonEmptyString } from '../utils/validation.js';

export async function signup(req, res) {
  try {
    const { name, email, password } = req.body;
    const errName = requireNonEmptyString(name, 'Name');
    if (errName) return res.status(400).json({ message: errName });
    const errEmail = requireNonEmptyString(email, 'Email');
    if (errEmail) return res.status(400).json({ message: errEmail });
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email format' });
    const errPass = requireNonEmptyString(password, 'Password');
    if (errPass) return res.status(400).json({ message: errPass });
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existing = await userModel.findUserByEmail(email);
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const id = await userModel.createUser({
      name,
      email,
      passwordHash,
      role: 'member',
    });
    const user = await userModel.findUserById(id);
    return res.status(201).json({ message: 'User created', user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const errEmail = requireNonEmptyString(email, 'Email');
    if (errEmail) return res.status(400).json({ message: errEmail });
    const errPass = requireNonEmptyString(password, 'Password');
    if (errPass) return res.status(400).json({ message: errPass });

    const user = await userModel.findUserByEmail(email.trim().toLowerCase());
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}
