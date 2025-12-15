import { parsePartialJson } from "@langchain/core/output_parsers";
import { useStreamContext } from "@/providers/Stream";
import { AIMessage, Checkpoint, Message } from "@langchain/langgraph-sdk";
import { getContentString } from "../utils";
import { BranchSwitcher, CommandBar } from "./shared";
import { MarkdownText } from "../markdown-text";
import { LoadExternalComponent } from "@langchain/langgraph-sdk/react-ui";
import { cn } from "@/lib/utils";
import { ToolCalls, ToolResult } from "./tool-calls";
import { MessageContentComplex } from "@langchain/core/messages";
import { Fragment } from "react/jsx-runtime";
import { isAgentInboxInterruptSchema } from "@/lib/agent-inbox-interrupt";
import { isWizardInterrupt } from "@/lib/wizard-interrupt";
import { ThreadView } from "../agent-inbox";
import { WizardStepForm, WizardStepMessage } from "../wizard";
import type { StepPayload } from "@/lib/wizard-types";
import { useQueryState, parseAsBoolean } from "nuqs";
import { GenericInterruptView } from "./generic-interrupt";
import { useArtifact } from "../artifact";

function CustomComponent({
  message,
  thread,
}: {
  message: Message;
  thread: ReturnType<typeof useStreamContext>;
}) {
  const artifact = useArtifact();
  const { values } = useStreamContext();
  const customComponents = values.ui?.filter(
    (ui) => ui.metadata?.message_id === message.id,
  );

  if (!customComponents?.length) return null;
  return (
    <Fragment key={message.id}>
      {customComponents.map((customComponent) => (
        <LoadExternalComponent
          key={customComponent.id}
          stream={thread}
          message={customComponent}
          meta={{ ui: customComponent, artifact }}
        />
      ))}
    </Fragment>
  );
}

function parseAnthropicStreamedToolCalls(
  content: MessageContentComplex[],
): AIMessage["tool_calls"] {
  const toolCallContents = content.filter((c) => c.type === "tool_use" && c.id);

  return toolCallContents.map((tc) => {
    const toolCall = tc as Record<string, any>;
    let json: Record<string, any> = {};
    if (toolCall?.input) {
      try {
        json = parsePartialJson(toolCall.input) ?? {};
      } catch {
        // Pass
      }
    }
    return {
      name: toolCall.name ?? "",
      id: toolCall.id ?? "",
      args: json,
      type: "tool_call",
    };
  });
}

interface InterruptProps {
  interrupt?: unknown;
  isLastMessage: boolean;
  hasNoAIOrToolMessages: boolean;
}

function Interrupt({
  interrupt,
  isLastMessage,
  hasNoAIOrToolMessages,
}: InterruptProps) {
  const fallbackValue = Array.isArray(interrupt)
    ? (interrupt as Record<string, any>[])
    : (((interrupt as { value?: unknown } | undefined)?.value ??
        interrupt) as Record<string, any>);

  return (
    <>
      {/* Wizard interrupt -> Custom wizard form */}
      {isWizardInterrupt(interrupt) &&
        (isLastMessage || hasNoAIOrToolMessages) && (
          <WizardStepForm interrupt={interrupt} />
        )}
      {/* HITL interrupt -> Agent inbox UI (skip if wizard) */}
      {isAgentInboxInterruptSchema(interrupt) &&
        !isWizardInterrupt(interrupt) &&
        (isLastMessage || hasNoAIOrToolMessages) && (
          <ThreadView interrupt={interrupt} />
        )}
      {/* Fallback generic (skip if wizard or HITL) */}
      {interrupt &&
      !isAgentInboxInterruptSchema(interrupt) &&
      !isWizardInterrupt(interrupt) &&
      (isLastMessage || hasNoAIOrToolMessages) ? (
        <GenericInterruptView interrupt={fallbackValue} />
      ) : null}
    </>
  );
}

export function AssistantMessage({
  message,
  isLoading,
  handleRegenerate,
}: {
  message: Message | undefined;
  isLoading: boolean;
  handleRegenerate: (parentCheckpoint: Checkpoint | null | undefined) => void;
}) {
  const content = message?.content ?? [];
  const contentString = getContentString(content);
  const [hideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(false),
  );

  const thread = useStreamContext();
  const isLastMessage =
    thread.messages[thread.messages.length - 1].id === message?.id;
  const hasNoAIOrToolMessages = !thread.messages.find(
    (m) => m.type === "ai" || m.type === "tool",
  );
  const meta = message ? thread.getMessagesMetadata(message) : undefined;
  const threadInterrupt = thread.interrupt;

  // Check for wizard step data in additional_kwargs
  const wizardStep = message?.additional_kwargs?.wizard_step as
    | StepPayload
    | undefined;

  const parentCheckpoint = meta?.firstSeenState?.parent_checkpoint;
  const anthropicStreamedToolCalls = Array.isArray(content)
    ? parseAnthropicStreamedToolCalls(content)
    : undefined;

  // Internal tools that should not be rendered in the UI
  const HIDDEN_TOOL_NAMES = ["getWizardContext", "startWizard", "resumeWizard"];

  // Filter out internal wizard tools from display
  const visibleToolCalls = message?.tool_calls?.filter(
    (tc) => !HIDDEN_TOOL_NAMES.includes(tc.name ?? "")
  );
  const visibleAnthropicToolCalls = anthropicStreamedToolCalls?.filter(
    (tc) => !HIDDEN_TOOL_NAMES.includes(tc.name ?? "")
  );

  const hasToolCalls = visibleToolCalls && visibleToolCalls.length > 0;
  const toolCallsHaveContents =
    hasToolCalls &&
    visibleToolCalls?.some(
      (tc) => tc.args && Object.keys(tc.args).length > 0,
    );
  const hasAnthropicToolCalls = !!visibleAnthropicToolCalls?.length;
  const isToolResult = message?.type === "tool";
  const isHiddenToolResult =
    isToolResult && HIDDEN_TOOL_NAMES.includes((message as any)?.name ?? "");

  // Hide tool results for internal tools, or all tool results if hideToolCalls is enabled
  if (isToolResult && (hideToolCalls || isHiddenToolResult)) {
    return null;
  }

  return (
    <div className="group mr-auto flex w-full items-start gap-2">
      <div className="flex w-full flex-col gap-2">
        {isToolResult ? (
          <>
            <ToolResult message={message} />
            <Interrupt
              interrupt={threadInterrupt}
              isLastMessage={isLastMessage}
              hasNoAIOrToolMessages={hasNoAIOrToolMessages}
            />
          </>
        ) : (
          <>
            {contentString.length > 0 &&
              !wizardStep &&
              // Skip raw JSON/streaming data that leaks through during streaming
              !contentString.trim().startsWith("{") && (
              <div className="py-1">
                <MarkdownText>{contentString}</MarkdownText>
              </div>
            )}

            {!hideToolCalls && (
              <>
                {(hasToolCalls && toolCallsHaveContents && (
                  <ToolCalls toolCalls={visibleToolCalls} />
                )) ||
                  (hasAnthropicToolCalls && (
                    <ToolCalls toolCalls={visibleAnthropicToolCalls} />
                  )) ||
                  (hasToolCalls && (
                    <ToolCalls toolCalls={visibleToolCalls} />
                  ))}
              </>
            )}

            {message && (
              <CustomComponent
                message={message}
                thread={thread}
              />
            )}

            {/* Wizard step form (message-based, not interrupt-based) */}
            {/* Only render when not loading to prevent partial JSON flash during streaming */}
            {wizardStep && !isLoading && (
              <WizardStepMessage
                stepPayload={wizardStep}
                isLastMessage={isLastMessage}
              />
            )}
            {/* Show loading indicator while wizard step is streaming */}
            {wizardStep && isLoading && (
              <div className="flex h-8 items-center gap-1 rounded-2xl bg-blue-50 px-4 py-2">
                <div className="h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-blue-400"></div>
                <div className="h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_0.5s_infinite] rounded-full bg-blue-400"></div>
                <div className="h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_1s_infinite] rounded-full bg-blue-400"></div>
              </div>
            )}

            {/* Skip interrupt rendering when wizard step is present - they're mutually exclusive */}
            {!wizardStep && (
              <Interrupt
                interrupt={threadInterrupt}
                isLastMessage={isLastMessage}
                hasNoAIOrToolMessages={hasNoAIOrToolMessages}
              />
            )}
            <div
              className={cn(
                "mr-auto flex items-center gap-2 transition-opacity",
                "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
              )}
            >
              <BranchSwitcher
                branch={meta?.branch}
                branchOptions={meta?.branchOptions}
                onSelect={(branch) => thread.setBranch(branch)}
                isLoading={isLoading}
              />
              <CommandBar
                content={contentString}
                isLoading={isLoading}
                isAiMessage={true}
                handleRegenerate={() => handleRegenerate(parentCheckpoint)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function AssistantMessageLoading() {
  return (
    <div className="mr-auto flex items-start gap-2">
      <div className="bg-muted flex h-8 items-center gap-1 rounded-2xl px-4 py-2">
        <div className="bg-foreground/50 h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full"></div>
        <div className="bg-foreground/50 h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_0.5s_infinite] rounded-full"></div>
        <div className="bg-foreground/50 h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_1s_infinite] rounded-full"></div>
      </div>
    </div>
  );
}
