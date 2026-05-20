// server/src/routes/sync.js
import express from 'express';
import Note from '../models/Note.js';

const router = express.Router();

function cleanNotePayload(note) {
  return {
    id: String(note.id ?? ''),
    title: String(note.title ?? ''),
    body: String(note.body ?? ''),
    deleted: Boolean(note.deleted),
    color: String(note.color ?? 'default'),
    fontFamily: String(note.fontFamily ?? 'serif'),
    fontSize: String(note.fontSize ?? 'medium'),
    lineHeight: String(note.lineHeight ?? 'relaxed'),
    pinned: Boolean(note.pinned),
    tags: Array.isArray(note.tags) ? note.tags.map(String) : [],
    versions: Array.isArray(note.versions) ? note.versions.map(v => ({
      title: String(v.title ?? 'Untitled note'),
      body: String(v.body ?? ''),
      updatedAt: String(v.updatedAt ?? new Date().toISOString())
    })) : [],
    createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
    updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date(),
  };
}

router.post('/', async (req, res, next) => {
  try {
    const incomingNotes = Array.isArray(req.body.notes) ? req.body.notes : [];
    let synced = 0;

    for (const rawNote of incomingNotes) {
      const note = cleanNotePayload(rawNote);

      if (!note.id) {
        continue;
      }

      const existing = await Note.findOne({ _id: note.id, userId: req.userId });

      if (existing && existing.updatedAt > note.updatedAt) {
        synced += 1;
        continue;
      }

      await Note.findOneAndUpdate(
        { _id: note.id, userId: req.userId },
        {
          $set: {
            title: note.title,
            body: note.body,
            deleted: note.deleted,
            color: note.color,
            fontFamily: note.fontFamily,
            fontSize: note.fontSize,
            lineHeight: note.lineHeight,
            pinned: note.pinned,
            tags: note.tags,
            versions: note.versions,
            updatedAt: note.updatedAt,
          },
          $setOnInsert: {
            _id: note.id,
            userId: req.userId,
            createdAt: note.createdAt,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          timestamps: false,
        },
      );

      synced += 1;
    }

    return res.json({ success: true, synced });
  } catch (error) {
    return next(error);
  }
});

// Exports the sync router that applies offline note mutations using last-write-wins timestamps.
export default router;
