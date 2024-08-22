module coin_flip_addr::coin_flip {
    use aptos_framework::account::{Self, SignerCapability};
    use aptos_framework::coin;
    use aptos_framework::randomness;
    use aptos_framework::event::emit;
    use aptos_std::type_info;
    use std::string::String;
    use std::math64;
    use std::signer;
    #[test_only]
    use aptos_framework::aptos_coin::AptosCoin;
    #[test_only]
    use aptos_framework::aptos_coin;
    #[test_only]
    use aptos_framework::event::emitted_events;
    #[test_only]
    use std::vector;

    const SEED: vector<u8> = b"coin flip";
    const FLIP_MULTIPLIER: u64 = 2;
    const FEE_BPS: u64 = 250; // default %2.5
    const FEE_DENOMINATOR: u64 = 10000;

    const EBALANCE_IS_NOT_ENGOUH: u64 = 1;
    const ENOT_ADMIN: u64 = 2;
    #[test_only]
    const EBALANCE_IS_NOT_RIGHT: u64 = 3;

    struct Vault has key {
        signer_cap: SignerCapability,
        fee_bps: u64,
    }

    #[event]
    struct FlipEvent has store, drop {
        player: address,
        is_won: bool,
        coin_name: String,
        amount_bet: u64,
        heads: bool,
    }

    fun init_module(deployer: &signer) {
        let (resource, signer_cap) = account::create_resource_account(deployer, SEED);
        move_to(&resource, Vault {
            signer_cap,
            fee_bps: FEE_BPS,
        });
    }

    #[randomness]
    entry fun play<CoinType>(
        player: &signer,
        amount: u64,
        heads: bool,
    ) acquires Vault {
        let player_address = signer::address_of(player);
        let coin_name = type_info::type_name<CoinType>();

        let vault_address = get_vault_address();
        let vault_signer = get_vault_signer();

        let from_balance: u64 = coin::balance<CoinType>(signer::address_of(player));
        assert!(amount <= from_balance, EBALANCE_IS_NOT_ENGOUH);

        // 50% chance to win. 0 represents tails, 1 represents heads
        let flip_result = randomness::u64_range(0, 2);

        let fee_bps = get_fee_bps();
        // 2.5% fee
        let amount_with_fees = amount + math64::mul_div(
            fee_bps,
            amount,
            FEE_DENOMINATOR,
        );

        // transfer bet amount + fees to the vault
        coin::transfer<CoinType>(player, vault_address, amount_with_fees);

        if (heads && flip_result == 1 || !heads && flip_result == 0) {
            emit(FlipEvent {
                player: player_address,
                is_won: true,
                coin_name,
                amount_bet: amount,
                heads: flip_result == 1,
            });

            // double bet amount
            let reward_amount = amount * FLIP_MULTIPLIER;
            // reward player
            coin::transfer<CoinType>(&vault_signer, player_address, reward_amount);

        } else {
            emit(FlipEvent {
                player: player_address,
                is_won: false,
                coin_name,
                amount_bet: amount,
                heads: flip_result == 1,
            });
        };
    }

    public entry fun deposit_vault<CoinType>(from: &signer, amount: u64) acquires Vault {
        let vault_address = get_vault_address();
        let vault_signer = get_vault_signer();
        coin::register<CoinType>(&vault_signer);
        let from_balance: u64 = coin::balance<CoinType>(signer::address_of(from));
        assert!(amount <= from_balance, EBALANCE_IS_NOT_ENGOUH);
        coin::transfer<CoinType>(from, vault_address, amount);
    }

    public entry fun withdraw_vault<CoinType>(admin: &signer, amount: u64) acquires Vault {
        let vault_address = account::create_resource_address(&signer::address_of(admin), SEED);
        assert!(exists<Vault>(vault_address), ENOT_ADMIN);
        let vault_balance: u64 = coin::balance<CoinType>(vault_address);
        assert!(amount <= vault_balance, EBALANCE_IS_NOT_ENGOUH);
        let vault_signer = get_vault_signer();
        coin::transfer<CoinType>(&vault_signer, signer::address_of(admin), amount);
    }

    public entry fun set_fee_bps(admin: &signer, fee_bps: u64) acquires Vault {
        let vault_address = account::create_resource_address(&signer::address_of(admin), SEED);
        assert!(exists<Vault>(vault_address), ENOT_ADMIN);
        let vault = borrow_global_mut<Vault>(vault_address);
        vault.fee_bps = fee_bps;
    }

    inline fun get_vault_address(): address {
        account::create_resource_address(&@coin_flip_addr, SEED)
    }

    inline fun get_vault_signer(): signer {
        let vault_address = get_vault_address();
        let vault = borrow_global<Vault>(vault_address);
        account::create_signer_with_capability(&vault.signer_cap)
    }

    inline fun get_fee_bps(): u64 {
        let vault_address = get_vault_address();
        let vault = borrow_global<Vault>(vault_address);
        vault.fee_bps
    }

    #[test(admin=@coin_flip_addr, user=@0x123, framework=@0x1)]
    fun test_flip(admin: &signer, user: &signer, framework: &signer) acquires Vault {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
        randomness::initialize_for_testing(framework);
        init_module(admin);
        let aptos_framework = account::create_account_for_test(@aptos_framework);
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(&aptos_framework);
        let vault_signer = get_vault_signer();
        coin::register<AptosCoin>(user);
        coin::register<AptosCoin>(&vault_signer);

        aptos_coin::mint(&aptos_framework, signer::address_of(user), 2_00_000_000);
        aptos_coin::mint(&aptos_framework, signer::address_of(&vault_signer), 4_00_000_000);
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);

        let play_amount = 1_00_000_000;
        let before_user_balance = coin::balance<AptosCoin>(signer::address_of(user));
        play<AptosCoin>(user, play_amount, true);
        let after_user_balance = coin::balance<AptosCoin>(signer::address_of(user));
        let module_events = emitted_events<FlipEvent>();
        let flip_event = vector::borrow(&module_events, 0);
        let coin_name = type_info::type_name<AptosCoin>();
        std::debug::print(flip_event);
        assert!(flip_event.coin_name == coin_name, 5);
        let amount_with_fees = play_amount + math64::mul_div(
            FEE_BPS,
            play_amount,
            FEE_DENOMINATOR,
        );
        if (flip_event.is_won) {
            let win_amount = play_amount * FLIP_MULTIPLIER;
            assert!(after_user_balance - before_user_balance == win_amount - amount_with_fees, EBALANCE_IS_NOT_RIGHT);
        } else {
            assert!(before_user_balance - after_user_balance == amount_with_fees, EBALANCE_IS_NOT_RIGHT);
        };
    }
}
