import mongoose from 'mongoose';

const TrainingCourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  badgeName: { type: String, required: true },
  durationHours: { type: Number, default: 4 },
  level: { type: String, enum: ['Basic', 'Intermediate', 'Advanced', 'Master'], default: 'Intermediate' },
  description: { type: String, required: true },
  topicsCovered: { type: [String], default: [] },
  passingScore: { type: Number, default: 80 },
  instructor: { type: String, default: 'Tamil Nadu Skill Development & Safety Board' },
  enrolledCount: { type: Number, default: 120 }
}, {
  timestamps: true
});

TrainingCourseSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('TrainingCourse', TrainingCourseSchema);
