import { FhevmInstance, generateKeypair, generatePublicKey, createInstance } from 'fhevmjs'
import { ethers } from 'ethers'

// FHE instance for encryption operations
let fhevmInstance: FhevmInstance | null = null

// Contract configuration for FHE
const FHE_CONFIG = {
  chainId: 11155111, // Sepolia testnet
  publicKeyId: '0x32d07df8db3933e990ad8bf9a8bb0cc7ba4ac58e0c8e04a60cf997b4e8ad9756',
  gatewayUrl: 'https://gateway.sepolia.zama.ai'
}

/**
 * Initialize FHE instance
 */
export async function initializeFHE(): Promise<FhevmInstance> {
  if (fhevmInstance) {
    return fhevmInstance
  }

  try {
    console.log('🔐 Initializing FHE instance...')
    
    fhevmInstance = await createInstance({
      chainId: FHE_CONFIG.chainId,
      publicKeyId: FHE_CONFIG.publicKeyId,
      gatewayUrl: FHE_CONFIG.gatewayUrl
    })
    
    console.log('✅ FHE instance initialized successfully')
    return fhevmInstance
  } catch (error) {
    console.error('❌ Failed to initialize FHE:', error)
    throw new Error('Failed to initialize FHE encryption')
  }
}

/**
 * Encrypt a 32-bit unsigned integer (for income, debt)
 */
export async function encryptUint32(value: number): Promise<Uint8Array> {
  if (!fhevmInstance) {
    throw new Error('FHE instance not initialized')
  }
  
  console.log(`🔒 Encrypting uint32 value: ${value}`)
  const encrypted = fhevmInstance.encrypt32(value)
  console.log(`✅ Encrypted uint32 (${value}) to ${encrypted.length} bytes`)
  return encrypted
}

/**
 * Encrypt an 8-bit unsigned integer (for age, credit history, payment history)
 */
export async function encryptUint8(value: number): Promise<Uint8Array> {
  if (!fhevmInstance) {
    throw new Error('FHE instance not initialized')
  }
  
  console.log(`🔒 Encrypting uint8 value: ${value}`)
  const encrypted = fhevmInstance.encrypt8(value)
  console.log(`✅ Encrypted uint8 (${value}) to ${encrypted.length} bytes`)
  return encrypted
}

/**
 * Convert encrypted data to bytes for contract call
 */
export function encryptedToBytes(encrypted: Uint8Array): string {
  return '0x' + Array.from(encrypted).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Decrypt a result from the contract (if you have the private key)
 */
export async function decryptResult(encryptedResult: string): Promise<number> {
  if (!fhevmInstance) {
    throw new Error('FHE instance not initialized')
  }
  
  // Convert hex string to Uint8Array
  const bytes = new Uint8Array(
    encryptedResult.slice(2).match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
  )
  
  // This would require the private key for decryption
  // For now, we'll return a placeholder since decryption requires special permissions
  console.log('🔓 Attempting to decrypt result...')
  return 0 // Placeholder - actual decryption requires private key
}

/**
 * Encrypt all credit data for submission
 */
export async function encryptCreditData(data: {
  income: number
  debt: number
  age: number
  creditHistory: number
  paymentHistory: number
}): Promise<{
  encryptedIncome: string
  encryptedDebt: string
  encryptedAge: string
  encryptedCreditHistory: string
  encryptedPaymentHistory: string
}> {
  console.log('🔐 Starting credit data encryption...')
  
  // Ensure FHE is initialized
  await initializeFHE()
  
  // Encrypt each field
  const [
    encryptedIncome,
    encryptedDebt,
    encryptedAge,
    encryptedCreditHistory,
    encryptedPaymentHistory
  ] = await Promise.all([
    encryptUint32(data.income),
    encryptUint32(data.debt),
    encryptUint8(data.age),
    encryptUint8(data.creditHistory),
    encryptUint8(data.paymentHistory)
  ])
  
  const result = {
    encryptedIncome: encryptedToBytes(encryptedIncome),
    encryptedDebt: encryptedToBytes(encryptedDebt),
    encryptedAge: encryptedToBytes(encryptedAge),
    encryptedCreditHistory: encryptedToBytes(encryptedCreditHistory),
    encryptedPaymentHistory: encryptedToBytes(encryptedPaymentHistory)
  }
  
  console.log('✅ Credit data encryption completed:')
  console.log('📊 Encrypted sizes:', {
    income: encryptedIncome.length,
    debt: encryptedDebt.length,
    age: encryptedAge.length,
    creditHistory: encryptedCreditHistory.length,
    paymentHistory: encryptedPaymentHistory.length
  })
  
  return result
}

/**
 * Get FHE instance status
 */
export function getFHEStatus(): {
  isInitialized: boolean
  config: typeof FHE_CONFIG
} {
  return {
    isInitialized: fhevmInstance !== null,
    config: FHE_CONFIG
  }
}

/**
 * Reset FHE instance (for testing or error recovery)
 */
export function resetFHE(): void {
  console.log('🔄 Resetting FHE instance...')
  fhevmInstance = null
}