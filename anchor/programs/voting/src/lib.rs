#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("6z68wfurCMYkZG51s1Et9BJEd9nJGUusjHXNt4dGbNNF");

pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;

#[program]
pub mod voting {
    use super::*;

    pub fn initialize_poll(
        ctx: Context<InitializePoll>,
        poll_id: u64,
        poll_description: String,
        poll_start: u64,
        poll_end: u64,
    ) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        poll.poll_id = poll_id;
        poll.description = poll_description;
        poll.poll_end = poll_end;
        poll.candidate_amount = 0;

        Ok(())
    }

    pub fn initialize_candidate(
        ctx: Context<InitializeCandidate>,
        candidate_name: String,
        _poll_id: u64,
    ) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        poll.candidate_amount += 1;
        let candidate = &mut ctx.accounts.candidate;
        candidate.candidate_name = candidate_name;
        candidate.candidate_votes = 0;

        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, _candidate_name: String, _poll_id: u64) -> Result<()> {
        let candidate = &mut ctx.accounts.candidate;
        candidate.candidate_votes += 1;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(candidate_name: String, poll_id: u64)]
pub struct Vote<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut, // this is very important to mention because even if you console log above in the vote function, it will say that you have voted and the count has increased and it won't give an error 
        // by default all accounts are immutable so in order to actually update the vote count, you'll need to mention mut!
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        mut,
        seeds = [poll_id.to_le_bytes().as_ref(), candidate_name.as_ref()],
        bump)]
    pub candidate: Account<'info, Candidate>,
}

#[derive(Accounts)]
#[instruction(poll_id: u64)] // this annotation tells Anchor that this instruction expects an additional argument (in this case, poll_id: u64) to be passed when the transaction is submitted
                             // it is an input argument for calling the transaction
pub struct InitializePoll<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = ANCHOR_DISCRIMINATOR_SIZE + Poll::INIT_SPACE,
        seeds = [poll_id.to_le_bytes().as_ref()], // this is different than b"poll_id"
        // poll_id.to_le_bytes() converts a numeric value (like a u64) into its little-endian byte array representation. This is dynamic, as it depends on the actual numeric value of poll_id.
        // b"poll_id" is a byte string representing the literal string "poll_id", and its byte representation is &[u8]. This means that b"poll_id" would always resolve to the byte array equivalent of the characters "poll_id".
        bump,
    )]
    pub poll: Account<'info, Poll>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(candidate_name: String, poll_id: u64)] // make sure the order of parameters here are in the same order as above in the instruction handler initialize_candidate
pub struct InitializeCandidate<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut, // again, you need to update the poll account every time a new candidate is added so mention mut!
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        init,
        payer = signer,
        space = ANCHOR_DISCRIMINATOR_SIZE + Candidate::INIT_SPACE,
        seeds = [poll_id.to_le_bytes().as_ref(), candidate_name.as_bytes()], // whats the difference between to_le_bytes and as_bytes
        bump,
    )]
    pub candidate: Account<'info, Candidate>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Candidate {
    #[max_len(32)]
    pub candidate_name: String,
    pub candidate_votes: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Poll {
    #[max_len(200)]
    pub description: String,

    pub poll_id: u64,
    pub poll_start: u64,
    pub poll_end: u64,
    pub candidate_amount: u64,
}