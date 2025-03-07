import { MAX_DEPTH, MIN_DEPTH } from "@semaphore-protocol/utils/constants"
import { requireArray, requireDefined, requireNumber, requireObject, requireString } from "@zk-kit/utils/error-handlers"
import { UltraHonkBackend } from "@aztec/bb.js"
import { requireUint8Array } from "@zk-kit/utils"
import { maybeGetUltranHonkArtifacts, Project } from "@modori-labs/artifacts"
import fs from "fs"
import hash from "./hash"
import { SemaphoreProof } from "./types"
// Temporary import
import { toHex } from "./toHex"

/**
 * Verifies whether a Semaphore proof is valid. Depending on the depth of the tree used to
 * generate the proof, a different verification key will be used.
 * @param proof The Semaphore proof.
 * @returns True if the proof is valid, false otherwise.
 */
export default async function verifyProof(semaphoreProof: SemaphoreProof): Promise<boolean> {
    requireDefined(semaphoreProof, "semaphoreProof")
    requireObject(semaphoreProof, "semaphoreProof")

    const { merkleTreeDepth, merkleTreeRoot, nullifier, message, scope, proof, publicInputs } = semaphoreProof

    requireNumber(merkleTreeDepth, "proof.merkleTreeDepth")
    requireString(merkleTreeRoot, "proof.merkleTreeRoot")
    requireString(nullifier, "proof.nullifier")
    requireString(message, "proof.message")
    requireString(scope, "proof.scope")
    requireUint8Array(proof, "proof.proof")
    requireArray(publicInputs, "proof.publicInputs")

    if (merkleTreeDepth < MIN_DEPTH || merkleTreeDepth > MAX_DEPTH) {
        throw new TypeError(`The tree depth must be a number between ${MIN_DEPTH} and ${MAX_DEPTH}`)
    }

    const { bytecode } = await maybeGetUltranHonkArtifacts(Project.SEMAPHORE_NOIR, {
        parameters: [merkleTreeDepth]
    })
    const bytecodeBuffer = fs.readFileSync(bytecode)

    const honk = new UltraHonkBackend(bytecodeBuffer.toString(), {
        threads: 1
    })

    return honk.verifyProof(
        {
            proof,
            publicInputs: [toHex(hash(scope)), toHex(hash(message)), toHex(merkleTreeRoot), nullifier]
        },
        {
            keccak: true
        }
    )
}
