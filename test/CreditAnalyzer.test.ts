import { expect } from "chai";
import { ethers } from "hardhat";
import { CreditAnalyzer } from "../types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CreditAnalyzer", function () {
  let creditAnalyzer: CreditAnalyzer;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const CreditAnalyzerFactory = await ethers.getContractFactory("CreditAnalyzer");
    creditAnalyzer = await CreditAnalyzerFactory.deploy();
    await creditAnalyzer.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await creditAnalyzer.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero evaluations", async function () {
      expect(await creditAnalyzer.totalEvaluations()).to.equal(0);
    });
  });

  describe("Credit Data Submission", function () {
    const sampleCreditData = {
      income: 5000,
      debt: 1000,
      age: 30,
      creditHistory: 5,
      paymentHistory: 8
    };

    it("Should allow user to submit credit data", async function () {
      await expect(
        creditAnalyzer.connect(user1).submitCreditData(
          sampleCreditData.income,
          sampleCreditData.debt,
          sampleCreditData.age,
          sampleCreditData.creditHistory,
          sampleCreditData.paymentHistory
        )
      ).to.emit(creditAnalyzer, "CreditDataSubmitted")
        .withArgs(user1.address, await ethers.provider.getBlockNumber() + 1);

      expect(await creditAnalyzer.hasSubmittedCreditData(user1.address)).to.be.true;
    });

    it("Should prevent duplicate submissions", async function () {
      // First submission
      await creditAnalyzer.connect(user1).submitCreditData(
        sampleCreditData.income,
        sampleCreditData.debt,
        sampleCreditData.age,
        sampleCreditData.creditHistory,
        sampleCreditData.paymentHistory
      );

      // Second submission should fail
      await expect(
        creditAnalyzer.connect(user1).submitCreditData(
          sampleCreditData.income,
          sampleCreditData.debt,
          sampleCreditData.age,
          sampleCreditData.creditHistory,
          sampleCreditData.paymentHistory
        )
      ).to.be.revertedWith("Data already submitted");
    });

    it("Should allow different users to submit their data", async function () {
      // User1 submits data
      await creditAnalyzer.connect(user1).submitCreditData(
        sampleCreditData.income,
        sampleCreditData.debt,
        sampleCreditData.age,
        sampleCreditData.creditHistory,
        sampleCreditData.paymentHistory
      );

      // User2 submits data
      await creditAnalyzer.connect(user2).submitCreditData(
        4000, 2000, 25, 3, 6
      );

      expect(await creditAnalyzer.hasSubmittedCreditData(user1.address)).to.be.true;
      expect(await creditAnalyzer.hasSubmittedCreditData(user2.address)).to.be.true;
    });
  });

  describe("Credit Evaluation", function () {
    beforeEach(async function () {
      // Submit credit data first
      await creditAnalyzer.connect(user1).submitCreditData(
        5000, 1000, 30, 5, 8
      );
    });

    it("Should allow self credit evaluation after data submission", async function () {
      await expect(
        creditAnalyzer.connect(user1).evaluateCreditScore(user1.address)
      ).to.emit(creditAnalyzer, "CreditEvaluated");

      expect(await creditAnalyzer.isCreditEvaluated(user1.address)).to.be.true;
      expect(await creditAnalyzer.totalEvaluations()).to.equal(1);
    });

    it("Should allow owner to evaluate any user's credit", async function () {
      await expect(
        creditAnalyzer.connect(owner).evaluateCreditScore(user1.address)
      ).to.emit(creditAnalyzer, "CreditEvaluated");

      expect(await creditAnalyzer.isCreditEvaluated(user1.address)).to.be.true;
    });

    it("Should prevent evaluation without data submission", async function () {
      await expect(
        creditAnalyzer.connect(user2).evaluateCreditScore(user2.address)
      ).to.be.revertedWith("No credit data submitted");
    });

    it("Should prevent duplicate evaluations", async function () {
      await creditAnalyzer.connect(user1).evaluateCreditScore(user1.address);

      await expect(
        creditAnalyzer.connect(user1).evaluateCreditScore(user1.address)
      ).to.be.revertedWith("Already evaluated");
    });

    it("Should prevent unauthorized user from evaluating others", async function () {
      // User2 submits their own data
      await creditAnalyzer.connect(user2).submitCreditData(
        4000, 2000, 25, 3, 6
      );

      // User1 tries to evaluate User2's credit (should fail)
      await expect(
        creditAnalyzer.connect(user1).evaluateCreditScore(user2.address)
      ).to.be.revertedWith("Not authorized to evaluate");
    });
  });

  describe("Loan Approval", function () {
    beforeEach(async function () {
      // Submit and evaluate credit data
      await creditAnalyzer.connect(user1).submitCreditData(
        5000, 1000, 30, 5, 8
      );
      await creditAnalyzer.connect(user1).evaluateCreditScore(user1.address);
    });

    it("Should allow loan approval request after evaluation", async function () {
      await expect(
        creditAnalyzer.connect(user1).requestLoanApproval()
      ).to.emit(creditAnalyzer, "LoanApprovalRequested")
        .withArgs(user1.address, await ethers.provider.getBlockNumber() + 1);
    });

    it("Should prevent loan approval without data submission", async function () {
      await expect(
        creditAnalyzer.connect(user2).requestLoanApproval()
      ).to.be.revertedWith("No credit data submitted");
    });

    it("Should prevent loan approval without evaluation", async function () {
      // User2 submits data but doesn't evaluate
      await creditAnalyzer.connect(user2).submitCreditData(
        4000, 2000, 25, 3, 6
      );

      await expect(
        creditAnalyzer.connect(user2).requestLoanApproval()
      ).to.be.revertedWith("Credit not evaluated yet");
    });
  });


  describe("Access Control and View Functions", function () {
    beforeEach(async function () {
      await creditAnalyzer.connect(user1).submitCreditData(
        5000, 1000, 30, 5, 8
      );
      await creditAnalyzer.connect(user1).evaluateCreditScore(user1.address);
    });

    it("Should return correct evaluation statistics", async function () {
      expect(await creditAnalyzer.getEvaluationStats()).to.equal(1);
      
      // Add another user and evaluate
      await creditAnalyzer.connect(user2).submitCreditData(
        4000, 2000, 25, 3, 6
      );
      await creditAnalyzer.connect(user2).evaluateCreditScore(user2.address);
      
      expect(await creditAnalyzer.getEvaluationStats()).to.equal(2);
    });

    it("Should allow user to check their own credit score", async function () {
      // This should not revert (user can access their own score)
      await expect(
        creditAnalyzer.connect(user1).getEncryptedCreditScore(user1.address)
      ).to.not.be.reverted;
    });

    it("Should allow owner to check any user's credit score", async function () {
      // This should not revert (owner can access any score)
      await expect(
        creditAnalyzer.connect(owner).getEncryptedCreditScore(user1.address)
      ).to.not.be.reverted;
    });

    it("Should prevent unauthorized access to credit scores", async function () {
      // User2 trying to access User1's score should fail
      await expect(
        creditAnalyzer.connect(user2).getEncryptedCreditScore(user1.address)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should allow checking loan approval status with proper access", async function () {
      // User can check their own approval status
      await expect(
        creditAnalyzer.connect(user1).getEncryptedLoanApproval(user1.address)
      ).to.not.be.reverted;

      // Owner can check any user's approval status
      await expect(
        creditAnalyzer.connect(owner).getEncryptedLoanApproval(user1.address)
      ).to.not.be.reverted;
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle view functions for non-existent users", async function () {
      expect(await creditAnalyzer.hasSubmittedCreditData(user1.address)).to.be.false;
      expect(await creditAnalyzer.isCreditEvaluated(user1.address)).to.be.false;
    });

    it("Should revert when trying to get credit score of non-evaluated user", async function () {
      await expect(
        creditAnalyzer.connect(user1).getEncryptedCreditScore(user1.address)
      ).to.be.revertedWith("Not evaluated");
    });

    it("Should revert when trying to get loan approval status of non-evaluated user", async function () {
      await expect(
        creditAnalyzer.connect(user1).getEncryptedLoanApproval(user1.address)
      ).to.be.revertedWith("Not evaluated");
    });
  });
});