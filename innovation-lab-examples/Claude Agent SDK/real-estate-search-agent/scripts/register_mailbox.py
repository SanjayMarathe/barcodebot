"""
register_mailbox.py - Registers the agent as a mailbox agent in Agentverse
without needing the Inspector UI.

Run once from the project root with the venv active:
    python register_mailbox.py
"""

import asyncio
import os

import aiohttp
from dotenv import load_dotenv
from uagents_core.config import AgentverseConfig
from uagents_core.identity import Identity
from uagents_core.registration import (
    ChallengeResponse,
    IdentityProof,
    RegistrationRequest,
)
from uagents_core.types import AgentEndpoint

load_dotenv()

AGENT_SEED = os.environ["AGENT_SEED"]
AGENT_NAME = os.getenv("AGENT_NAME", "real_estate_agent")
API_KEY = os.environ["AGENTVERSE_API_KEY"]

AGENTVERSE = AgentverseConfig()
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}


async def register():
    identity = Identity.from_seed(AGENT_SEED, 0)
    address = identity.address
    print(f"Agent address: {address}")

    async with aiohttp.ClientSession() as session:
        # Step 1: get challenge
        url = f"{AGENTVERSE.identity_api}/{address}/challenge"
        print(f"Getting challenge from {url} ...")
        async with session.get(url, headers=HEADERS) as resp:
            if resp.status != 200:
                body = await resp.text()
                print(f"FAILED to get challenge: {resp.status} {body}")
                return
            challenge = ChallengeResponse.model_validate_json(await resp.text())
        print(f"Challenge received: {challenge.challenge[:20]}...")

        # Step 2: prove identity
        proof = IdentityProof(
            address=address,
            challenge=challenge.challenge,
            challenge_response=identity.sign(challenge.challenge.encode()),
        )
        print(f"Proving identity to {AGENTVERSE.identity_api} ...")
        async with session.post(
            AGENTVERSE.identity_api,
            data=proof.model_dump_json(),
            headers=HEADERS,
        ) as resp:
            if resp.status != 200:
                body = await resp.text()
                print(f"FAILED to prove identity: {resp.status} {body}")
                return
        print("Identity proved successfully.")

        # Step 3: register as mailbox agent
        mailbox_endpoint = AGENTVERSE.mailbox_endpoint
        registration = RegistrationRequest(
            address=address,
            name=AGENT_NAME,
            agent_type="uagent",
            endpoints=[AgentEndpoint(url=mailbox_endpoint, weight=1)],
        )
        print(f"Registering mailbox agent at {AGENTVERSE.agents_api} ...")
        async with session.post(
            AGENTVERSE.agents_api,
            data=registration.model_dump_json(),
            headers=HEADERS,
        ) as resp:
            body = await resp.text()
            if resp.status == 200:
                print("SUCCESS: Mailbox agent registered in Agentverse!")
                print("Restart the Docker container — the agent will now connect.")
            else:
                print(f"FAILED to register: {resp.status} {body}")


if __name__ == "__main__":
    asyncio.run(register())
