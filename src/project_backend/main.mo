import Time "mo:base/Time";
import Map "mo:base/HashMap";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Iter "mo:base/Iter";
import UserModule "./user/lib";

actor Animint {
  
  // Types
  type AnimalId = Text;
  type MicrochipId = Text;
  type DNAHash = Text;
  
  type Animal = {
    id: AnimalId;
    microchipId: MicrochipId;
    species: Text;
    breed: Text;
    name: Text;
    owner: Principal;
    breeder: Principal;
    sire: ?AnimalId;
    dam: ?AnimalId;
    birthDate: Int;
    dnaHash: ?DNAHash;
    isVerified: Bool;
  };
  
  type Litter = {
    id: Text;
    sire: AnimalId;
    dam: AnimalId;
    birthDate: Int;
    offspring: [AnimalId];
    breeder: Principal;
  };
  
  type BreederStats = {
    breeder: Principal;
    totalAnimals: Nat;
    verifiedAnimals: Nat;
    reputationScore: Nat;
  };
  
  type BreedNFT = {
    id: Nat;
    breed: Text;
    owner: Principal;
    imageUrl: Text;
  };

  // Stable storage for orthogonal persistence
  private stable var nextAnimalId: Nat = 1;
  private stable var nextLitterId: Nat = 1;
  private stable var animalEntries: [(AnimalId, Animal)] = [];
  private stable var litterEntries: [(Text, Litter)] = [];
  private stable var breederEntries: [(Principal, BreederStats)] = [];
  private stable var microchipEntries: [(MicrochipId, AnimalId)] = [];
  // NFT storage
  private stable var nextBreedNftId: Nat = 1;
  private stable var breedNftEntries: [(Nat, BreedNFT)] = [];

  // Runtime storage
  private var animals = Map.HashMap<AnimalId, Animal>(0, Text.equal, Text.hash);
  private var litters = Map.HashMap<Text, Litter>(0, Text.equal, Text.hash);
  private var breederStats = Map.HashMap<Principal, BreederStats>(0, Principal.equal, Principal.hash);
  private var microchipRegistry = Map.HashMap<MicrochipId, AnimalId>(0, Text.equal, Text.hash);
  // Helper hash function for Nat
  private func natHash(n: Nat) : Nat32 {
    Nat32.fromNat(n)
  };
  private var breedNfts = Map.HashMap<Nat, BreedNFT>(0, Nat.equal, natHash);

  // User registry
  private let userRegistry = UserModule.Registry();

  // Constants
  private let VERIFICATION_REWARD: Nat = 100;
  
  // Initialize from stable storage
  private func initializeFromStable() {
    for ((id, animal) in animalEntries.vals()) {
      animals.put(id, animal);
    };
    for ((id, litter) in litterEntries.vals()) {
      litters.put(id, litter);
    };
    for ((breeder, stats) in breederEntries.vals()) {
      breederStats.put(breeder, stats);
    };
    for ((microchip, animalId) in microchipEntries.vals()) {
      microchipRegistry.put(microchip, animalId);
    };
    for ((nftId, nft) in breedNftEntries.vals()) {
      breedNfts.put(nftId, nft);
    };
  };
  
  // Call initialization
  initializeFromStable();
  
  // System lifecycle
  system func preupgrade() {
    animalEntries := Iter.toArray(animals.entries());
    litterEntries := Iter.toArray(litters.entries());
    breederEntries := Iter.toArray(breederStats.entries());
    microchipEntries := Iter.toArray(microchipRegistry.entries());
    breedNftEntries := Iter.toArray(breedNfts.entries());
  };
  
  system func postupgrade() {
    animalEntries := [];
    litterEntries := [];
    breederEntries := [];
    microchipEntries := [];
    breedNftEntries := [];
  };
  
  // Helper functions
  private func generateAnimalId(): AnimalId {
    let id = "ANIMAL_" # Nat.toText(nextAnimalId);
    nextAnimalId += 1;
    id
  };
  
  private func generateLitterId(): Text {
    let id = "LITTER_" # Nat.toText(nextLitterId);
    nextLitterId += 1;
    id
  };
  
  private func updateBreederStats(breeder: Principal, isVerified: Bool) {
    switch (breederStats.get(breeder)) {
      case (null) {
        breederStats.put(breeder, {
          breeder = breeder;
          totalAnimals = 1;
          verifiedAnimals = if (isVerified) 1 else 0;
          reputationScore = if (isVerified) VERIFICATION_REWARD else 0;
        });
      };
      case (?existing) {
        breederStats.put(breeder, {
          breeder = existing.breeder;
          totalAnimals = existing.totalAnimals + 1;
          verifiedAnimals = existing.verifiedAnimals + (if (isVerified) 1 else 0);
          reputationScore = existing.reputationScore + (if (isVerified) VERIFICATION_REWARD else 0);
        });
      };
    };
  };
  
  // Public functions
  public shared(msg) func registerAnimal(
    microchipId: MicrochipId,
    species: Text,
    breed: Text,
    name: Text,
    sire: ?AnimalId,
    dam: ?AnimalId,
    dnaHash: ?DNAHash
  ) : async Result.Result<AnimalId, Text> {
    
    let caller = msg.caller;
    
    // Check if microchip already registered
    switch (microchipRegistry.get(microchipId)) {
      case (?existing) {
        return #err("Microchip already registered to animal: " # existing);
      };
      case null {};
    };
    
    // Validate parents exist if provided
    switch (sire) {
      case (?sireId) {
        switch (animals.get(sireId)) {
          case null { return #err("Sire not found"); };
          case (?_) {};
        };
      };
      case null {};
    };
    
    switch (dam) {
      case (?damId) {
        switch (animals.get(damId)) {
          case null { return #err("Dam not found"); };
          case (?_) {};
        };
      };
      case null {};
    };
    
    let animalId = generateAnimalId();
    let now = Time.now();
    
    let animal: Animal = {
      id = animalId;
      microchipId = microchipId;
      species = species;
      breed = breed;
      name = name;
      owner = caller;
      breeder = caller;
      sire = sire;
      dam = dam;
      birthDate = now;
      dnaHash = dnaHash;
      isVerified = false;
    };
    
    animals.put(animalId, animal);
    microchipRegistry.put(microchipId, animalId);
    updateBreederStats(caller, false);
    
    #ok(animalId)
  };
  
  public shared(msg) func registerLitter(
    sire: AnimalId,
    dam: AnimalId,
    offspring: [AnimalId]
  ) : async Result.Result<Text, Text> {
    
    let caller = msg.caller;
    
    // Validate parents exist
    switch (animals.get(sire)) {
      case null { return #err("Sire not found"); };
      case (?_) {};
    };
    
    switch (animals.get(dam)) {
      case null { return #err("Dam not found"); };
      case (?_) {};
    };
    
    // Validate all offspring exist
    for (offspringId in offspring.vals()) {
      switch (animals.get(offspringId)) {
        case null { return #err("Offspring not found: " # offspringId); };
        case (?_) {};
      };
    };
    
    let litterId = generateLitterId();
    let now = Time.now();
    
    let litter: Litter = {
      id = litterId;
      sire = sire;
      dam = dam;
      birthDate = now;
      offspring = offspring;
      breeder = caller;
    };
    
    litters.put(litterId, litter);
    
    #ok(litterId)
  };
  
  public shared(msg) func verifyAnimal(animalId: AnimalId) : async Result.Result<(), Text> {
    let caller = msg.caller;
    
    switch (animals.get(animalId)) {
      case null { #err("Animal not found"); };
      case (?animal) {
        // Only breeder or owner can verify
        if (animal.breeder != caller and animal.owner != caller) {
          return #err("Not authorized to verify");
        };
        
        let verified = { animal with isVerified = true };
        animals.put(animalId, verified);
        updateBreederStats(animal.breeder, true);
        #ok(())
      };
    };
  };
  
  public shared(msg) func transferOwnership(animalId: AnimalId, newOwner: Principal) : async Result.Result<(), Text> {
    let caller = msg.caller;
    
    switch (animals.get(animalId)) {
      case null { #err("Animal not found"); };
      case (?animal) {
        if (animal.owner != caller) {
          return #err("Not authorized - only owner can transfer");
        };
        
        let updated = { animal with owner = newOwner };
        animals.put(animalId, updated);
        #ok(())
      };
    };
  };
  
  // NFT minting for breeds
  public shared(msg) func mintBreedNFT(breed: Text) : async Result.Result<Nat, Text> {
    let caller = msg.caller;
    // Only allow one NFT per breed per user
    for ((_, nft) in breedNfts.entries()) {
      if (nft.breed == breed and nft.owner == caller) {
        return #err("You already own an NFT for this breed");
      };
    };
    // Charge user for NFT minting
    switch (userRegistry.chargeForNFT(caller)) {
      case (#err(e)) { return #err(e); };
      case (#ok(_)) {};
    };
    let nftId = nextBreedNftId;
    nextBreedNftId += 1;
    let imageUrl = "https://placehold.co/200x200?text=" # breed;
    let nft: BreedNFT = {
      id = nftId;
      breed = breed;
      owner = caller;
      imageUrl = imageUrl;
    };
    breedNfts.put(nftId, nft);
    #ok(nftId)
  };

  // User account management
  public shared(msg) func registerUser() : async Result.Result<(), Text> {
    let principal = msg.caller;
    let now = Time.now();
    userRegistry.registerUser(principal, now)
  };

  public shared(msg) func verifyUser() : async Result.Result<(), Text> {
    let principal = msg.caller;
    userRegistry.verifyUser(principal)
  };

  public query func isUserRegistered(principal: Principal) : async Bool {
    userRegistry.isUserRegistered(principal)
  };

  public query func isUserVerified(principal: Principal) : async Bool {
    userRegistry.isUserVerified(principal)
  };

  public query func getUser(principal: Principal) : async ?UserModule.User {
    userRegistry.getUser(principal)
  };

  public query func getAllUsers() : async [UserModule.User] {
    userRegistry.allUsers()
  };

  public query func getBalance(principal: Principal) : async Nat {
    userRegistry.getBalance(principal)
  };

  // User account management
  public shared(msg) func registerUserByName(name: Text, password: Text) : async Result.Result<(), Text> {
    let principal = msg.caller;
    let now = Time.now();
    userRegistry.registerUserByName(name, password, principal, now)
  };

  public shared(_msg) func verifyUserByName(name: Text, password: Text) : async Result.Result<Principal, Text> {
    userRegistry.verifyUserByName(name, password)
  };

  public query func isUserRegisteredByName(name: Text) : async Bool {
    userRegistry.isUserRegisteredByName(name)
  };

  // Query functions
  public query func getAnimal(animalId: AnimalId) : async ?Animal {
    animals.get(animalId)
  };
  
  public query func getLitter(litterId: Text) : async ?Litter {
    litters.get(litterId)
  };
  
  public query func getBreederStats(breeder: Principal) : async ?BreederStats {
    breederStats.get(breeder)
  };
  
  public query func getLineage(animalId: AnimalId) : async [Animal] {
    var lineage: [Animal] = [];
    
    switch (animals.get(animalId)) {
      case null { [] };
      case (?animal) {
        lineage := Array.append(lineage, [animal]);
        
        // Add sire
        switch (animal.sire) {
          case (?sireId) {
            switch (animals.get(sireId)) {
              case (?sire) { lineage := Array.append(lineage, [sire]); };
              case null {};
            };
          };
          case null {};
        };
        
        // Add dam
        switch (animal.dam) {
          case (?damId) {
            switch (animals.get(damId)) {
              case (?dam) { lineage := Array.append(lineage, [dam]); };
              case null {};
            };
          };
          case null {};
        };
        
        lineage
      };
    };
  };
  
  public query func verifyMicrochip(microchipId: MicrochipId) : async ?AnimalId {
    microchipRegistry.get(microchipId)
  };
  
  public query func getAnimalsByOwner(owner: Principal) : async [Animal] {
    var result: [Animal] = [];
    for ((id, animal) in animals.entries()) {
      if (animal.owner == owner) {
        result := Array.append(result, [animal]);
      };
    };
    result
  };
  
  public query func getAnimalsByBreeder(breeder: Principal) : async [Animal] {
    var result: [Animal] = [];
    for ((id, animal) in animals.entries()) {
      if (animal.breeder == breeder) {
        result := Array.append(result, [animal]);
      };
    };
    result
  };
  
  public query func getAllAnimals() : async [Animal] {
    var result: [Animal] = [];
    for ((id, animal) in animals.entries()) {
      result := Array.append(result, [animal]);
    };
    result
  };
  
  public query func getAllBreedNFTs() : async [BreedNFT] {
    Iter.toArray(breedNfts.vals())
  };

  public query func getBreedNFTsByOwner(owner: Principal) : async [BreedNFT] {
    var result: [BreedNFT] = [];
    for ((_, nft) in breedNfts.entries()) {
      if (nft.owner == owner) {
        result := Array.append(result, [nft]);
      };
    };
    result
  };
  
  // System functions
  public query func getStats() : async {
    totalAnimals: Nat;
    totalLitters: Nat;
    totalBreeders: Nat;
    verifiedAnimals: Nat;
  } {
    var verifiedCount = 0;
    for ((id, animal) in animals.entries()) {
      if (animal.isVerified) {
        verifiedCount += 1;
      };
    };
    
    {
      totalAnimals = animals.size();
      totalLitters = litters.size();
      totalBreeders = breederStats.size();
      verifiedAnimals = verifiedCount;
    }
  };
}