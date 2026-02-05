const Event = require("../models/Event");
const User = require("../models/User");
const Wallet = require("../models/Wallet");

async function handleGetEventRegister(req, res) {
  const { id } = req.params;
  const { _id } = req.user;

  const eventId = Number(id);
  if (Number.isNaN(eventId)) {
    return res.status(400).send("Invalid Request from the server!");
  }

  try {
    const user = await User.findById(_id);
    if (!user) return res.redirect("/login");

    const event = await Event.findOne({ eventId });
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });

    if (event.eventSize === event.eventArray.length) {
      return res.status(403).send("Event is full.")
    }

    const alreadyJoined = event.eventArray.some(
      (team) => team.owner && team.owner.toString() === _id.toString()
    );
    if (alreadyJoined) {
      return res
        .status(403)
        .send("Already joined in this event");
    }

    const { wallet, ign } = user;
    return res.render("payment.ejs", { event, wallet, ign });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function handleRegPayment(req, res) {
  const { id, players, teamName } = req.body;
  const { _id } = req.user;

  try {
    // Validate eventId
    const eventId = Number(id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid event ID!" });
    }

    if (!teamName) {
        return res
            .status(403)
            .json({success: false, message: "Enter a valid Team Name."})
    }

    const event = await Event.findOne({ eventId });
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found!" });
    }

    const user = await User.findById(_id);
    if (!user) {
      return res.status(401).json({ success: false, redirectedTo: "/login" });
    }

    // Check if already registered
    const alreadyExists = event.eventArray.some((entry) =>
      entry.owner && entry.owner.equals(_id)
    );

    if (alreadyExists) {
      return res
        .status(409)
        .json({ success: false, message: "Already registered in this event" });
    }

    // Wallet check
    const totalCost = event.eventEntry;
    if (user.wallet < totalCost) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    user.wallet -= totalCost;

    const slot = event.eventArray.length + 1
    // Push registration references
    if (!user.registeredArray.includes(event._id)) {
      user.registeredArray.push(event._id);
    }
    if (!alreadyExists) {
      let obj = {
        owner: _id,
        team: teamName,
        players,
        slot
      }
      event.eventArray.push(obj);
    }

    // Save updates
    await Promise.all([user.save(), event.save()]);
    await updateTransactions(_id, totalCost);

    return res.status(200).json({
      success: true,
      redirectedTo: "/my-games",
      wallet: user.wallet,
    });

  } catch (err) {
    console.error("Error in handleRegPayment:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Try again later." });
  }
}

async function updateTransactions(_id, entryFee) {
  try {
    const user = await User.findById(_id);
    const transId = "event_" + Date.now();

    const userTransaction = {
      transId: transId,
      type: "debit",
      source: "event_entry",
      amount: entryFee,
      status: "SUCCESS",
      date: Date.now(),
    };

    user.transactions.push(userTransaction);
    await user.save();

    const transaction = {
      userId: _id,
      transId: transId,
      type: "debit",
      source: "event_entry",
      amount: entryFee,
      balanceAfter: user.wallet,
      status: "SUCCESS",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await Wallet.create(transaction);
  } catch (err) {
    console.log("Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  handleGetEventRegister,
  handleRegPayment,
  updateTransactions,
};
