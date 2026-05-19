// server/src/routes/notes.js
import { randomUUID } from 'node:crypto';
import express from 'express';
import Note from '../models/Note.js';

const router = express.Router();

function serializeNote(note) {
  return {
    id: note._id,
    title: note.title,
    body: note.body,
    deleted: note.deleted,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const notes = await Note.find({ userId: req.userId }).sort({ updatedAt: -1 });
    return res.json({ notes: notes.map(serializeNote) });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    return res.json({ note: serializeNote(note) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const now = new Date();
    const id = req.body.id ?? randomUUID();
    const note = await Note.findOneAndUpdate(
      { _id: id, userId: req.userId },
      {
        $set: {
          title: req.body.title ?? '',
          body: req.body.body ?? '',
          deleted: false,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: id,
          userId: req.userId,
          createdAt: now,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        timestamps: false,
      },
    );

    return res.status(201).json({ note: serializeNote(note) });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        $set: {
          title: req.body.title ?? '',
          body: req.body.body ?? '',
          deleted: false,
        },
      },
      { new: true },
    );

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    return res.json({ note: serializeNote(note) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { deleted: true } },
      { new: true },
    );

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    return res.json({ note: serializeNote(note) });
  } catch (error) {
    return next(error);
  }
});

// Exports the authenticated notes router for list, read, upsert, update, and soft delete.
export default router;
