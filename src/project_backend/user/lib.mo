import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Map "mo:base/HashMap";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";
import Blob "mo:base/Blob";

module UserModule {
  public type User = {
    principal: Principal;
    name: Text;
    passwordHash: Blob;
    registeredAt: Int;
    isVerified: Bool;
    balance: Nat;
  };

  let INITIAL_TOKENS: Nat = 10_000; // Enough for 1-2 NFTs
  let NFT_COST: Nat = 5_000;
  let TOPUP_AMOUNT: Nat = 10_000;

  public class Registry() {
    private var users = Map.HashMap<Principal, User>(0, Principal.equal, Principal.hash);
    private var nameToPrincipal = Map.HashMap<Text, Principal>(0, Text.equal, Text.hash);

    // Simple password hash using Text.hash (returns Nat32, not cryptographically secure)
    private func hashPassword(password: Text) : Blob {
      let h : Nat32 = Text.hash(password);
      let arr : [Nat8] = [
        Nat8.fromNat(Nat32.toNat((h >> 24) & 0xFF)),
        Nat8.fromNat(Nat32.toNat((h >> 16) & 0xFF)),
        Nat8.fromNat(Nat32.toNat((h >> 8) & 0xFF)),
        Nat8.fromNat(Nat32.toNat(h & 0xFF))
      ];
      Blob.fromArray(arr)
    };

    public func registerUserByName(name: Text, password: Text, principal: Principal, now: Int) : Result.Result<(), Text> {
      if (nameToPrincipal.get(name) != null) {
        return #err("Name already registered");
      };
      if (users.get(principal) != null) {
        return #err("Principal already registered");
      };
      let user: User = {
        principal = principal;
        name = name;
        passwordHash = hashPassword(password);
        registeredAt = now;
        isVerified = false;
        balance = INITIAL_TOKENS;
      };
      users.put(principal, user);
      nameToPrincipal.put(name, principal);
      #ok(())
    };

    public func verifyUserByName(name: Text, password: Text) : Result.Result<Principal, Text> {
      switch (nameToPrincipal.get(name)) {
        case null { return #err("Name not registered"); };
        case (?principal) {
          switch (users.get(principal)) {
            case null { return #err("User not found"); };
            case (?user) {
              if (user.passwordHash == hashPassword(password)) {
                #ok(principal)
              } else {
                #err("Incorrect password")
              }
            }
          }
        }
      }
    };

    public func registerUser(_principal: Principal, _now: Int) : Result.Result<(), Text> {
      #err("Use registerUserByName for name/password registration")
    };

    public func verifyUser(_principal: Principal) : Result.Result<(), Text> {
      #err("Use verifyUserByName for name/password authentication")
    };

    public func isUserRegisteredByName(name: Text) : Bool {
      nameToPrincipal.get(name) != null
    };

    public func isUserRegistered(principal: Principal) : Bool {
      users.get(principal) != null
    };

    public func isUserVerified(principal: Principal) : Bool {
      switch (users.get(principal)) {
        case (?user) { user.isVerified };
        case null { false };
      }
    };

    public func getUser(principal: Principal) : ?User {
      users.get(principal)
    };

    public func allUsers() : [User] {
      Iter.toArray(users.vals())
    };

    public func getBalance(principal: Principal) : Nat {
      switch (users.get(principal)) {
        case (?user) { user.balance };
        case null { 0 };
      }
    };

    public func topUp(principal: Principal) : Result.Result<Nat, Text> {
      switch (users.get(principal)) {
        case null { return #err("User not found"); };
        case (?user) {
          let newBal = user.balance + TOPUP_AMOUNT;
          users.put(principal, { user with balance = newBal });
          #ok(newBal)
        }
      }
    };

    public func chargeForNFT(principal: Principal) : Result.Result<Nat, Text> {
      switch (users.get(principal)) {
        case null { return #err("User not found"); };
        case (?user) {
          if (user.balance < NFT_COST) {
            return #err("Insufficient balance");
          };
          let newBal = Nat.sub(user.balance, NFT_COST);
          users.put(principal, { user with balance = newBal });
          #ok(newBal)
        }
      }
    };
  }
}
