import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("🚀 Starting deployment of Credit Analyzer contract...");
  
  // Get the ContractFactory
  const CreditAnalyzer = await ethers.getContractFactory("CreditAnalyzer");
  
  // Deploy the contract
  console.log("📦 Deploying contract...");
  const creditAnalyzer = await CreditAnalyzer.deploy();
  
  await creditAnalyzer.waitForDeployment();
  const contractAddress = await creditAnalyzer.getAddress();
  
  console.log("✅ Credit Analyzer deployed to:", contractAddress);
  
  // Get deployment transaction info
  const deploymentTx = creditAnalyzer.deploymentTransaction();
  if (deploymentTx) {
    console.log("📝 Deployment transaction hash:", deploymentTx.hash);
    console.log("⛽ Gas used:", deploymentTx.gasLimit.toString());
  }
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress: contractAddress,
    deploymentBlock: await ethers.provider.getBlockNumber(),
    deploymentTime: new Date().toISOString(),
    network: await ethers.provider.getNetwork(),
    txHash: deploymentTx?.hash || "unknown"
  };
  
  // Write deployment info to file
  const deploymentPath = join(process.cwd(), "deployments", `credit-analyzer-${deploymentInfo.network.name}.json`);
  
  try {
    writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info saved to:", deploymentPath);
  } catch (error) {
    console.log("⚠️  Could not save deployment info:", error);
  }
  
  // Update frontend constants
  const constantsPath = join(process.cwd(), "src", "utils", "constants.ts");
  try {
    let constantsContent = `// Contract configuration
export const CONTRACT_ADDRESS = "${contractAddress}"

export const CONTRACT_ABI = [
  "function submitCreditData(uint32, uint32, uint8, uint8, uint8) external",
  "function evaluateCreditScore(address) external", 
  "function requestLoanApproval() external",
  "function getCreditScore(address) external view returns (uint8)",
  "function getLoanApprovalStatus(address) external view returns (bool)",
  "function hasSubmittedCreditData(address) external view returns (bool)",
  "function isCreditEvaluated(address) external view returns (bool)",
  "function getEvaluationStats() external view returns (uint256)",
  "function updateCreditData(uint32, uint32, uint8, uint8, uint8) external",
  "event CreditDataSubmitted(address indexed user, uint256 timestamp)",
  "event CreditEvaluated(address indexed user, uint256 timestamp)",
  "event LoanApprovalRequested(address indexed user, uint256 timestamp)"
]

// Network configuration
export const SEPOLIA_CHAIN_ID = '0xaa36a7'
export const SEPOLIA_NETWORK = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: 'Sepolia Test Network',
  rpcUrls: ['https://sepolia.infura.io/v3/'],
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  blockExplorerUrls: ['https://sepolia.etherscan.io/']
}

// Preset values for credit data
export const INCOME_PRESETS = [
  { label: '$3,000', value: 3000 },
  { label: '$5,000', value: 5000 },
  { label: '$8,000', value: 8000 },
  { label: '$12,000', value: 12000 }
]

export const DEBT_PRESETS = [
  { label: '$0', value: 0 },
  { label: '$5,000', value: 5000 },
  { label: '$15,000', value: 15000 },
  { label: '$30,000', value: 30000 }
]

export const AGE_PRESETS = [
  { label: '25', value: 25 },
  { label: '30', value: 30 },
  { label: '40', value: 40 },
  { label: '50', value: 50 }
]

export const CREDIT_HISTORY_PRESETS = [
  { label: '2 years', value: 2 },
  { label: '5 years', value: 5 },
  { label: '10 years', value: 10 },
  { label: '15+ years', value: 15 }
]

export const PAYMENT_HISTORY_PRESETS = [
  { label: '5 - Fair', value: 5 },
  { label: '7 - Good', value: 7 },
  { label: '9 - Excellent', value: 9 },
  { label: '10 - Perfect', value: 10 }
]`;
    
    writeFileSync(constantsPath, constantsContent);
    console.log("🔄 Frontend constants updated with new contract address");
  } catch (error) {
    console.log("⚠️  Could not update frontend constants:", error);
  }
  
  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Next steps:");
  console.log("   1. Verify the contract on Etherscan (if needed)");
  console.log("   2. Test the contract functions");
  console.log("   3. Deploy the frontend to production");
  
  // Verify contract if on Sepolia and Etherscan API key is available
  if (process.env.ETHERSCAN_API_KEY && deploymentInfo.network.name === "sepolia") {
    console.log("\n🔍 Attempting to verify contract on Etherscan...");
    try {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      
      const hre = require("hardhat");
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      
      console.log("✅ Contract verified on Etherscan!");
    } catch (error) {
      console.log("⚠️  Verification failed:", error);
      console.log("   You can manually verify later using:");
      console.log(`   npx hardhat verify --network sepolia ${contractAddress}`);
    }
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });