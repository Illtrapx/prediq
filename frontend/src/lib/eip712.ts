import type { JsonRpcSigner, TypedDataDomain, TypedDataField } from 'ethers'

type Eip712Payload = {
  domain: unknown
  types: unknown
  message: unknown
}

/**
 * Sign an EIP-712 payload from the Zama FHEVM SDK.
 *
 * The SDK includes `EIP712Domain` in its `types` map, but ethers v6 derives the
 * domain separator itself and rejects that key — strip it before signing.
 */
export async function signEip712(signer: JsonRpcSigner, eip712: Eip712Payload): Promise<string> {
  const types = { ...(eip712.types as Record<string, TypedDataField[]>) }
  delete types.EIP712Domain
  return signer.signTypedData(
    eip712.domain as TypedDataDomain,
    types,
    eip712.message as Record<string, unknown>,
  )
}
