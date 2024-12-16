import { solveAntiCaptcha, solve2Captcha } from "./utils/solver.js";
import { readWallets } from "./utils/script.js";
import banner from "./utils/banner.js";
import log from "./utils/logger.js";
import readline from "readline";
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs';

function askUserOption() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question(
            "Choose Captcha Solver:\n1. Anti-Captcha\n2. 2Captcha\nEnter your choice (1/2): ",
            (answer) => {
                rl.close();
                resolve(answer);
            }
        );
    });
}

function askApiKey(solverName) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question(`Enter your API key for ${solverName}: `, (apiKey) => {
            rl.close();
            resolve(apiKey);
        });
    });
}

async function getFaucet(payload, proxy) {
    const agent = new HttpsProxyAgent(proxy);
    const url = "https://faucetv2-api.expchain.ai/api/faucet";
    try {
        log.info("Getting Faucet...");

        // send post by axios
        const response = await axios.post(url, payload, {
            headers: {
                "Content-Type": "application/json",
            },
            httpsAgent: agent,
        });

        const data = response.data;
        return data;
    } catch (error) {
        log.error("Error Getting Faucet:", error);
    }
}

const getProxies = () => {
    return fs.readFileSync('proxy.txt', 'utf8').split('\n').map(line => line.trim()).filter(Boolean);
};

const getAPI = () => {
    return fs.readFileSync('api.txt', 'utf8').split('\n').map(line => line.trim()).filter(Boolean);
};


async function getFaucetAll() {
    log.warn(banner);
    const wallets = readWallets();
    const proxies = getProxies();
    if (!wallets) {
        log.error("Please Create new wallets first...");
        process.exit(1);
    }
    log.info(`Found ${wallets.length} existing wallets...`);

    const userChoice = "1";
    let solveCaptcha;
    const apiKey = getAPI();
    if (userChoice === "1") {
        log.info("Using Anti-Captcha Solver...");
        solveCaptcha = solveAntiCaptcha;
    } else if (userChoice === "2") {
        log.info("Using 2Captcha Solver...");
        solveCaptcha = solve2Captcha;
        apiKey = await askApiKey("2Captcha");
    } else {
        log.error("Invalid choice! Exiting...");
        process.exit(1);
    }



    for (let i = 0; i < proxies.length; i++) {
        const proxy = proxies[i];
        const wallet = wallets[i];

        log.info(`=== Starting Getting Faucet for  ${i} ++++++++++`);
        log.info(`=== Starting Getting Faucet for wallet ${wallet.address} ===`);
        const payloadFaucet = {
            chain_id: 18880,
            to: wallet.address,
            cf_turnstile_response: await solveCaptcha(apiKey[0]),
        };
        const faucet = await getFaucet(payloadFaucet, proxy);

        if (faucet && faucet.message === 'Success') {
            log.info(`Faucet Success https://blockscout-testnet.expchain.ai/address/${wallet.address}`);
        } else {
            log.error(`${faucet?.data || 'Unknown error'} Claim Faucet Failed...`);
        }

        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));

    }
}

getFaucetAll();


