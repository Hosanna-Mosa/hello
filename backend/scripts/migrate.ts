/**
 * Applies indexes. Run on deploy, and after any model change.
 *
 * `syncIndexes()` creates what is missing and DROPS what the schema no longer
 * declares, so the database matches the code rather than accumulating whatever
 * anyone ever created by hand.
 *
 * This is a separate step from booting on purpose: `autoIndex` is off, because
 * a process that builds indexes on startup will eventually do it on a large
 * collection during a deploy and take the service down while it does.
 */

import { connectMongo, disconnectMongo } from "@/config/mongo.js";
import { AdminModel } from "@/models/admin.model.js";
import { AvatarModel } from "@/models/avatar.model.js";
import { InterestModel } from "@/models/interest.model.js";
import { LikeModel } from "@/models/like.model.js";
import { CallModel } from "@/models/call.model.js";
import { DeletedAccountModel } from "@/models/deletedAccount.model.js";
import { PaymentOrderModel } from "@/models/paymentOrder.model.js";
import { MatchModel } from "@/models/match.model.js";
import { MessageModel } from "@/models/message.model.js";
import { MessageRequestModel } from "@/models/messageRequest.model.js";
import { PassModel } from "@/models/pass.model.js";
import { PlanModel } from "@/models/plan.model.js";
import { ThreadModel } from "@/models/thread.model.js";
import { SessionModel } from "@/models/session.model.js";
import { SupportMessageModel } from "@/models/supportMessage.model.js";
import { SupportTicketModel } from "@/models/supportTicket.model.js";
import { UserModel } from "@/models/user.model.js";

const MODELS = [
  UserModel, DeletedAccountModel, PaymentOrderModel, SessionModel, AdminModel, InterestModel, AvatarModel, PlanModel, PassModel,
  LikeModel, MessageRequestModel, MatchModel, ThreadModel, MessageModel, CallModel,
  SupportTicketModel, SupportMessageModel,
];

async function main(): Promise<void> {
  await connectMongo();

  for (const model of MODELS) {
    const dropped = await model.syncIndexes();
    const current = await model.collection.indexes();
    process.stdout.write(
      `  ${model.modelName.padEnd(10)} ${current.length} index(es)${dropped.length ? `, dropped ${dropped.join(", ")}` : ""}\n`,
    );
    for (const idx of current) {
      process.stdout.write(`      - ${idx.name}\n`);
    }
  }

  await disconnectMongo();
  process.stdout.write("\nindexes applied\n");
  process.exit(0);
}

void main();
