import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Returns the collection reference for a user's vocabulary words.
 * Path: users/{userId}/words
 */
export const getUserWordsCollection = (userId) => {
  if (!userId) throw new Error('User ID is required');
  return collection(db, 'users', userId, 'words');
};

/**
 * Real-time listener for user vocabulary words.
 */
export const subscribeUserWords = (userId, onWordsUpdated, onError) => {
  if (!userId) return () => {};

  const wordsRef = getUserWordsCollection(userId);
  const q = query(wordsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const words = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        // Format timestamp for display or fallback
        createdAtDate: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(),
        updatedAtDate: d.data().updatedAt?.toDate ? d.data().updatedAt.toDate() : new Date()
      }));
      onWordsUpdated(words);
    },
    (error) => {
      console.error('Error fetching words:', error);
      if (onError) onError(error);
    }
  );
};

/**
 * Adds a new word to the user's vocabulary.
 */
export const addWord = async (userId, { word, meaning, example = '', isMemorized = false }) => {
  if (!userId) throw new Error('User ID is required');
  if (!word?.trim()) throw new Error('영어 단어를 입력해주세요.');
  if (!meaning?.trim()) throw new Error('뜻을 입력해주세요.');

  const wordsRef = getUserWordsCollection(userId);
  return await addDoc(wordsRef, {
    word: word.trim(),
    meaning: meaning.trim(),
    example: (example || '').trim(),
    isMemorized: Boolean(isMemorized),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

/**
 * Updates an existing word.
 */
export const updateWord = async (userId, wordId, { word, meaning, example, isMemorized }) => {
  if (!userId || !wordId) throw new Error('User ID and Word ID are required');

  const wordRef = doc(db, 'users', userId, 'words', wordId);
  const updates = {
    updatedAt: serverTimestamp()
  };

  if (word !== undefined) updates.word = word.trim();
  if (meaning !== undefined) updates.meaning = meaning.trim();
  if (example !== undefined) updates.example = (example || '').trim();
  if (isMemorized !== undefined) updates.isMemorized = Boolean(isMemorized);

  return await updateDoc(wordRef, updates);
};

/**
 * Toggles the memorization status.
 */
export const toggleWordMemorized = async (userId, wordId, currentStatus) => {
  if (!userId || !wordId) throw new Error('User ID and Word ID are required');

  const wordRef = doc(db, 'users', userId, 'words', wordId);
  return await updateDoc(wordRef, {
    isMemorized: !currentStatus,
    updatedAt: serverTimestamp()
  });
};

/**
 * Deletes a word.
 */
export const deleteWord = async (userId, wordId) => {
  if (!userId || !wordId) throw new Error('User ID and Word ID are required');

  const wordRef = doc(db, 'users', userId, 'words', wordId);
  return await deleteDoc(wordRef);
};
