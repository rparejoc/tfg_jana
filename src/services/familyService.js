import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'

const toFamilyServiceError = (error, fallbackMessage) => ({
  code: error?.code || 'firestore/unknown',
  message: fallbackMessage,
  originalError: error,
})

const getRequiredUser = (user) => {
  if (!user?.uid) {
    throw new Error('A valid user with uid is required.')
  }

  return user
}

const generateInviteCode = (length = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''

  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * chars.length)
    code += chars[index]
  }

  return code
}

const addFamilyIdToUser = async (user, familyId) => {
  const userRef = doc(db, 'users', user.uid)

  try {
    await updateDoc(userRef, {
      familyIds: arrayUnion(familyId),
      activeFamilyId: familyId,
    })
  } catch (error) {
    if (error?.code !== 'not-found') {
      throw error
    }

    await setDoc(
      userRef,
      {
        displayName: user?.displayName || null,
        email: user?.email || null,
        createdAt: serverTimestamp(),
        familyIds: [familyId],
        activeFamilyId: familyId,
      },
      { merge: true },
    )
  }
}

export const createFamily = async (name, user) => {
  try {
    const authUser = getRequiredUser(user)

    if (!name?.trim()) {
      throw new Error('Family name is required.')
    }

    const familiesRef = collection(db, 'families')
    const familyDoc = await addDoc(familiesRef, {
      name: name.trim(),
      createdBy: authUser.uid,
      createdAt: serverTimestamp(),
      inviteCode: generateInviteCode(),
    })

    await setDoc(
      doc(db, 'families', familyDoc.id, 'members', authUser.uid),
      {
        role: 'admin',
        joinedAt: serverTimestamp(),
      },
      { merge: true },
    )

    await addFamilyIdToUser(authUser, familyDoc.id)

    return { familyId: familyDoc.id, error: null }
  } catch (error) {
    return {
      familyId: null,
      error: toFamilyServiceError(error, 'Unable to create family right now.'),
    }
  }
}

export const joinFamily = async (inviteCode, user) => {
  try {
    const authUser = getRequiredUser(user)

    if (!inviteCode?.trim()) {
      throw new Error('Invite code is required.')
    }

    const familiesRef = collection(db, 'families')
    const familyQuery = query(
      familiesRef,
      where('inviteCode', '==', inviteCode.trim().toUpperCase()),
      limit(1),
    )
    const snapshot = await getDocs(familyQuery)

    if (snapshot.empty) {
      return {
        familyId: null,
        error: toFamilyServiceError(null, 'Invalid invite code.'),
      }
    }

    const familyDoc = snapshot.docs[0]
    const familyId = familyDoc.id

    await setDoc(
      doc(db, 'families', familyId, 'members', authUser.uid),
      {
        role: 'member',
        joinedAt: serverTimestamp(),
      },
      { merge: true },
    )

    await addFamilyIdToUser(authUser, familyId)

    return { familyId, error: null }
  } catch (error) {
    return {
      familyId: null,
      error: toFamilyServiceError(error, 'Unable to join family right now.'),
    }
  }
}

export const getFamilyMembers = async (familyId) => {
  if (!familyId) {
    return {
      members: [],
      error: toFamilyServiceError(null, 'A valid familyId is required.'),
    }
  }

  try {
    const membersRef = collection(db, 'families', familyId, 'members')
    const snapshot = await getDocs(membersRef)

    const members = snapshot.docs.map((memberDoc) => ({
      id: memberDoc.id,
      ...memberDoc.data(),
    }))

    return { members, error: null }
  } catch (error) {
    return {
      members: [],
      error: toFamilyServiceError(error, 'Unable to fetch family members right now.'),
    }
  }
}

const familyService = {
  createFamily,
  joinFamily,
  getFamilyMembers,
}

export default familyService
