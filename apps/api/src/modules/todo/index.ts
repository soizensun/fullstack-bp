/**
 * BE_01 R4 / BE_03 R2 — this module's entire public surface.
 *
 * It publishes no port, because nothing else in the application needs a fact from
 * todo today. BE_03 R8 — a boundary that buys nothing should not be built, so the
 * barrel exports the Nest module and stops there.
 */
export { TodoModule } from './todo.module';
