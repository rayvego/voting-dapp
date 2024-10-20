import {PublicKey} from "@solana/web3.js";
import {startAnchor} from "solana-bankrun";
import {Voting} from "../target/types/voting"
import {Program} from "@coral-xyz/anchor";
import {BankrunProvider} from "anchor-bankrun";
import * as anchor from "@coral-xyz/anchor";

// * IDL is the interface definition for the voting program which includes information about the program's methods and accounts.
// * Basically, it's a JSON representation of the program's interface.
// * Interface means the methods and accounts that the program exposes to the outside world.
const IDL = require("../target/idl/voting.json")

// * Setting the voting program address to the address of the deployed program on the Solana blockchain.
const votingAddress = new PublicKey("6z68wfurCMYkZG51s1Et9BJEd9nJGUusjHXNt4dGbNNF")

// * We will use jest to write tests for the voting program.
// * describe() is a jest function that groups tests together.
// * It takes two arguments: a string that describes the group of tests and a function that contains the tests.
// * it() is a jest function that defines a test.
describe("Voting", () => {

    // * First, we need to set up the context and provider for the program.
    // * The context is the anchor context that contains the program and provider is the provider that will be used to interact with the program.
    // * The provider is a BankrunProvider that is used to interact with the program.
    // * In simpler words, the provider is the connection between the program and the Solana blockchain and context is the program itself.
    let context;
    let provider;
    let votingProgram: Program<Voting>;

    // * Since, we'll need to interact with the program in multiple tests, we'll set up the context and provider before all the tests.
    beforeAll(async () => {
        // * startAnchor() is a function that sets up the anchor context and returns it.
        // * It takes three arguments: the program IDL, the program's address and the program's associated program IDs.
        // * In our case, we're not using any associated programs, so we pass an empty array.
        context = await startAnchor("", [{name: "voting", programId: votingAddress}], [])
        provider = new BankrunProvider(context)

        // * Program is a class provided by the anchor library that is used to interact with the program.
        // * It takes two arguments: the program's IDL and the provider.
        votingProgram = new Program<Voting>(IDL, provider)
    })

    // * We'll write tests for the voting program here.

    // * The first test is to initialize the poll.
    it("Initialize Poll", async () => {

        // * The votingProgram.methods object contains all the methods exposed by the program.
        // * anchor.BN is a class provided by the anchor library that is used to represent big numbers.
        // * .rpc() is a method that is used to call the program's method. If we don't write it, the method will simply return a promise.
        await votingProgram.methods.initializePoll(
            new anchor.BN(1),
            "What is your favorite type of peanut butter?",
            new anchor.BN(0),
            new anchor.BN(1821246480),
        ).rpc()

        // * PublicKey.findProgramAddressSync() is to find the PDA of the poll account.
        // * We're passing in the same arguments that we accepted in the rust smart contract.
        const [pollAddress] = PublicKey.findProgramAddressSync(
            [new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
            votingAddress,
        )

        // * Once we have the poll account address, we can fetch the poll account from the blockchain.
        // * votingProgram.account.poll.fetch() is used to fetch the poll account from the blockchain.
        const poll = await votingProgram.account.poll.fetch(pollAddress)

        // * We can now write assertions to check if the poll account was initialized correctly.
        expect(poll.pollId.toNumber()).toEqual(1)
        expect(poll.description).toEqual("What is your favorite type of peanut butter?")
        expect(poll.pollStart.toNumber()).toEqual(0)
    })

    // * The second test is to initialize the candidate.
    it("initialize candidate", async() => {
        // * We'll initialize two candidates: Smooth and Crunchy.
        await votingProgram.methods.initializeCandidate(
            "Smooth",
            new anchor.BN(1),
        ).rpc()

        await votingProgram.methods.initializeCandidate(
            "Crunchy",
            new anchor.BN(1),
        ).rpc()

        // * Find the PDA of the candidate accounts.
        const [crunchyAddress] = PublicKey.findProgramAddressSync(
            [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Crunchy")],
            votingAddress,
        )

        const [smoothAddress] = PublicKey.findProgramAddressSync(
          [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Smooth")],
          votingAddress,
        )

        // * Fetch the candidate accounts from the blockchain and write assertions to check if they were initialized correctly.
        const crunchy = await votingProgram.account.candidate.fetch(crunchyAddress)
        expect(crunchy.candidateName).toEqual("Crunchy")
        expect(crunchy.candidateVotes.toNumber()).toEqual(0)

        const smooth = await votingProgram.account.candidate.fetch(smoothAddress)
        expect(smooth.candidateName).toEqual("Smooth")
        expect(smooth.candidateVotes.toNumber()).toEqual(0)
    })

    // * The third test is to vote for a candidate.
    it("vote", async() => {
        // * Vote for the Smooth candidate.
        await votingProgram.methods.vote(
            "Smooth",
            new anchor.BN(1),
        ).rpc()

        // * Find the PDA of the candidate account.
        const [smoothAddress] = PublicKey.findProgramAddressSync(
            [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Smooth")],
            votingAddress,
        )

        // * Fetch the candidate account from the blockchain and write assertions to check if the vote was successful.
        const smoothCandidate = await votingProgram.account.candidate.fetch(smoothAddress)
        expect(smoothCandidate.candidateVotes.toNumber()).toEqual(1)
    })

})