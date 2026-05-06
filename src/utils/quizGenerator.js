// Quiz generation is now handled by the backend API.
// This file re-exports constants and provides API-backed helpers.

import { CATEGORIES } from './questionBank';
import { api } from './api';

const QUESTIONS_PER_CATEGORY = 5;
export const TOTAL_QUIZ_QUESTIONS = CATEGORIES.length * QUESTIONS_PER_CATEGORY;

// Generate a quiz for the student via the backend
export async function generateLevelQuiz(studentId) {
  try {
    return await api.generateQuiz(studentId);
  } catch (err) {
    console.error('generateLevelQuiz failed:', err.message);
    return [];
  }
}

// Record which questions a student has used
export async function recordUsedQuestions(studentId, questionIds) {
  try {
    await api.recordUsedQuestions(studentId, questionIds);
  } catch (err) {
    console.error('recordUsedQuestions failed:', err.message);
  }
}

// Save a completed quiz attempt
export async function saveQuizAttempt(studentId, attemptData) {
  try {
    await api.saveAttempt({ userId: studentId, ...attemptData });
  } catch (err) {
    console.error('saveQuizAttempt failed:', err.message);
  }
}

// Fetch all attempts for a student
export async function getStudentAttempts(studentId) {
  try {
    return await api.getAttempts(studentId);
  } catch (err) {
    console.error('getStudentAttempts failed:', err.message);
    return [];
  }
}

export async function getAllAttempts() {
  return {};
}

export function getAttemptById(studentId, attemptId) {
  return null;
}

// Kept for backward compatibility — no-op, seeding handled via questionBank
export function clearUsedQuestions() {}
export function getUsedQuestionIds() { return []; }
