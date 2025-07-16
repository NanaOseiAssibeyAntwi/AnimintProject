import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Animal {
  'id' : AnimalId,
  'dam' : [] | [AnimalId],
  'birthDate' : bigint,
  'owner' : Principal,
  'dnaHash' : [] | [DNAHash],
  'name' : string,
  'sire' : [] | [AnimalId],
  'isVerified' : boolean,
  'microchipId' : MicrochipId,
  'breed' : string,
  'species' : string,
  'breeder' : Principal,
}
export type AnimalId = string;
export interface BreedNFT {
  'id' : bigint,
  'owner' : Principal,
  'imageUrl' : string,
  'breed' : string,
}
export interface BreederStats {
  'reputationScore' : bigint,
  'totalAnimals' : bigint,
  'verifiedAnimals' : bigint,
  'breeder' : Principal,
}
export type DNAHash = string;
export interface Litter {
  'id' : string,
  'dam' : AnimalId,
  'birthDate' : bigint,
  'sire' : AnimalId,
  'offspring' : Array<AnimalId>,
  'breeder' : Principal,
}
export type MicrochipId = string;
export type Result = { 'ok' : Principal } |
  { 'err' : string };
export type Result_1 = { 'ok' : null } |
  { 'err' : string };
export type Result_2 = { 'ok' : string } |
  { 'err' : string };
export type Result_3 = { 'ok' : AnimalId } |
  { 'err' : string };
export type Result_4 = { 'ok' : bigint } |
  { 'err' : string };
export interface User {
  'principal' : Principal,
  'balance' : bigint,
  'name' : string,
  'isVerified' : boolean,
  'passwordHash' : Uint8Array | number[],
  'registeredAt' : bigint,
}
export interface _SERVICE {
  'getAllAnimals' : ActorMethod<[], Array<Animal>>,
  'getAllBreedNFTs' : ActorMethod<[], Array<BreedNFT>>,
  'getAllUsers' : ActorMethod<[], Array<User>>,
  'getAnimal' : ActorMethod<[AnimalId], [] | [Animal]>,
  'getAnimalsByBreeder' : ActorMethod<[Principal], Array<Animal>>,
  'getAnimalsByOwner' : ActorMethod<[Principal], Array<Animal>>,
  'getBalance' : ActorMethod<[Principal], bigint>,
  'getBreedNFTsByOwner' : ActorMethod<[Principal], Array<BreedNFT>>,
  'getBreederStats' : ActorMethod<[Principal], [] | [BreederStats]>,
  'getLineage' : ActorMethod<[AnimalId], Array<Animal>>,
  'getLitter' : ActorMethod<[string], [] | [Litter]>,
  'getStats' : ActorMethod<
    [],
    {
      'totalAnimals' : bigint,
      'totalLitters' : bigint,
      'totalBreeders' : bigint,
      'verifiedAnimals' : bigint,
    }
  >,
  'getUser' : ActorMethod<[Principal], [] | [User]>,
  'isUserRegistered' : ActorMethod<[Principal], boolean>,
  'isUserRegisteredByName' : ActorMethod<[string], boolean>,
  'isUserVerified' : ActorMethod<[Principal], boolean>,
  'mintBreedNFT' : ActorMethod<[string], Result_4>,
  'registerAnimal' : ActorMethod<
    [
      MicrochipId,
      string,
      string,
      string,
      [] | [AnimalId],
      [] | [AnimalId],
      [] | [DNAHash],
    ],
    Result_3
  >,
  'registerLitter' : ActorMethod<
    [AnimalId, AnimalId, Array<AnimalId>],
    Result_2
  >,
  'registerUser' : ActorMethod<[], Result_1>,
  'registerUserByName' : ActorMethod<[string, string], Result_1>,
  'transferOwnership' : ActorMethod<[AnimalId, Principal], Result_1>,
  'verifyAnimal' : ActorMethod<[AnimalId], Result_1>,
  'verifyMicrochip' : ActorMethod<[MicrochipId], [] | [AnimalId]>,
  'verifyUser' : ActorMethod<[], Result_1>,
  'verifyUserByName' : ActorMethod<[string, string], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
