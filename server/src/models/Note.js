// server/src/models/Note.js
import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
    body: {
      type: String,
      default: '',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

noteSchema.index({ userId: 1, updatedAt: -1 });

const Note = mongoose.model('Note', noteSchema);

export default Note;
