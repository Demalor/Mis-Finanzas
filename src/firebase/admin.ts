import { collection, doc, getDocs, orderBy, query, setDoc, updateDoc } from 'firebase/firestore/lite'
import { db } from './config'
import type { InviteCode, UserProfile } from '../types/models'

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin caracteres ambiguos (0/O, 1/I)
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function createInviteCode(createdBy: string): Promise<InviteCode> {
  const code = randomCode()
  const invite: InviteCode = { code, createdBy, createdAt: Date.now(), used: false }
  await setDoc(doc(db, 'codigosInvitacion', code), invite)
  return invite
}

export async function getAllInviteCodes(): Promise<InviteCode[]> {
  const snap = await getDocs(query(collection(db, 'codigosInvitacion'), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => d.data() as InviteCode)
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, 'usuarios'), orderBy('creadoEn', 'desc')))
  return snap.docs.map((d) => d.data() as UserProfile)
}

export async function setUserActive(uid: string, activo: boolean) {
  await updateDoc(doc(db, 'usuarios', uid), { activo })
}
