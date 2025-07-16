export const idlFactory = ({ IDL }) => {
  const AnimalId = IDL.Text;
  const DNAHash = IDL.Text;
  const MicrochipId = IDL.Text;
  const Animal = IDL.Record({
    'id' : AnimalId,
    'dam' : IDL.Opt(AnimalId),
    'birthDate' : IDL.Int,
    'owner' : IDL.Principal,
    'dnaHash' : IDL.Opt(DNAHash),
    'name' : IDL.Text,
    'sire' : IDL.Opt(AnimalId),
    'isVerified' : IDL.Bool,
    'microchipId' : MicrochipId,
    'breed' : IDL.Text,
    'species' : IDL.Text,
    'breeder' : IDL.Principal,
  });
  const BreedNFT = IDL.Record({
    'id' : IDL.Nat,
    'owner' : IDL.Principal,
    'imageUrl' : IDL.Text,
    'breed' : IDL.Text,
  });
  const User = IDL.Record({
    'principal' : IDL.Principal,
    'balance' : IDL.Nat,
    'name' : IDL.Text,
    'isVerified' : IDL.Bool,
    'passwordHash' : IDL.Vec(IDL.Nat8),
    'registeredAt' : IDL.Int,
  });
  const BreederStats = IDL.Record({
    'reputationScore' : IDL.Nat,
    'totalAnimals' : IDL.Nat,
    'verifiedAnimals' : IDL.Nat,
    'breeder' : IDL.Principal,
  });
  const Litter = IDL.Record({
    'id' : IDL.Text,
    'dam' : AnimalId,
    'birthDate' : IDL.Int,
    'sire' : AnimalId,
    'offspring' : IDL.Vec(AnimalId),
    'breeder' : IDL.Principal,
  });
  const Result_4 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const Result_3 = IDL.Variant({ 'ok' : AnimalId, 'err' : IDL.Text });
  const Result_2 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const Result = IDL.Variant({ 'ok' : IDL.Principal, 'err' : IDL.Text });
  return IDL.Service({
    'getAllAnimals' : IDL.Func([], [IDL.Vec(Animal)], ['query']),
    'getAllBreedNFTs' : IDL.Func([], [IDL.Vec(BreedNFT)], ['query']),
    'getAllUsers' : IDL.Func([], [IDL.Vec(User)], ['query']),
    'getAnimal' : IDL.Func([AnimalId], [IDL.Opt(Animal)], ['query']),
    'getAnimalsByBreeder' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(Animal)],
        ['query'],
      ),
    'getAnimalsByOwner' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(Animal)],
        ['query'],
      ),
    'getBalance' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'getBreedNFTsByOwner' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(BreedNFT)],
        ['query'],
      ),
    'getBreederStats' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(BreederStats)],
        ['query'],
      ),
    'getLineage' : IDL.Func([AnimalId], [IDL.Vec(Animal)], ['query']),
    'getLitter' : IDL.Func([IDL.Text], [IDL.Opt(Litter)], ['query']),
    'getStats' : IDL.Func(
        [],
        [
          IDL.Record({
            'totalAnimals' : IDL.Nat,
            'totalLitters' : IDL.Nat,
            'totalBreeders' : IDL.Nat,
            'verifiedAnimals' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getUser' : IDL.Func([IDL.Principal], [IDL.Opt(User)], ['query']),
    'isUserRegistered' : IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'isUserRegisteredByName' : IDL.Func([IDL.Text], [IDL.Bool], ['query']),
    'isUserVerified' : IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'mintBreedNFT' : IDL.Func([IDL.Text], [Result_4], []),
    'registerAnimal' : IDL.Func(
        [
          MicrochipId,
          IDL.Text,
          IDL.Text,
          IDL.Text,
          IDL.Opt(AnimalId),
          IDL.Opt(AnimalId),
          IDL.Opt(DNAHash),
        ],
        [Result_3],
        [],
      ),
    'registerLitter' : IDL.Func(
        [AnimalId, AnimalId, IDL.Vec(AnimalId)],
        [Result_2],
        [],
      ),
    'registerUser' : IDL.Func([], [Result_1], []),
    'registerUserByName' : IDL.Func([IDL.Text, IDL.Text], [Result_1], []),
    'transferOwnership' : IDL.Func([AnimalId, IDL.Principal], [Result_1], []),
    'verifyAnimal' : IDL.Func([AnimalId], [Result_1], []),
    'verifyMicrochip' : IDL.Func([MicrochipId], [IDL.Opt(AnimalId)], ['query']),
    'verifyUser' : IDL.Func([], [Result_1], []),
    'verifyUserByName' : IDL.Func([IDL.Text, IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
