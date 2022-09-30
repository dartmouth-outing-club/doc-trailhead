import mongoose from 'mongoose';
const { Schema } = mongoose;

const ErrorSchema = new Schema({
  type: String,
  occuredDate: Date,
  message: String,
});

const ErrorModel = mongoose.model('Error', ErrorSchema);

const logError = (error) => {
  const errorLog = new ErrorModel();
  errorLog.type = error.type;
  errorLog.message = error.message;
  errorLog.occuredDate = new Date();
  errorLog.save();
};

// eslint-disable-next-line import/prefer-default-export
export { logError };
