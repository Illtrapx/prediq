import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedStakeToken = await deploy("ConfidentialStakeToken", {
    from: deployer,
    args: [1_000_000n],
    log: true,
  });

  const deployedPredictionMarket = await deploy("PredictionMarket", {
    from: deployer,
    args: [deployedStakeToken.address],
    log: true,
  });
};
export default func;
func.id = "deploy_v2"; // id required to prevent reexecution
func.tags = ["PredictionMarket", "ConfidentialStakeToken"];
