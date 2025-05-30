import { getUSDateFromString } from "@/components/shared/utils/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MappedLLMRequest } from "@/packages/llm-mapper/types";
import {
  ArrowPathIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addRequestLabel,
  addRequestScore,
} from "../../../services/lib/requests";
import { useOrg } from "../../layout/org/organizationContext";
import { clsx } from "../../shared/clsx";
import useNotification from "../../shared/notification/useNotification";
import ThemedModal from "../../shared/themed/themedModal";
import { formatNumber } from "../../shared/utils/formatNumber";
import NewDataset from "../datasets/NewDataset";
import FeedbackButtons from "../feedback/thumbsUpThumbsDown";
import ModelPill from "./modelPill";
import { RenderMappedRequest } from "./RenderHeliconeRequest";
import StatusBadge from "./statusBadge";

function getPathName(url: string) {
  try {
    return new URL(url).pathname;
  } catch (e) {
    return url;
  }
}

interface RequestRowProps {
  request: MappedLLMRequest;
  properties: string[];
  open?: boolean;
  wFull?: boolean;
  displayPreview?: boolean;
  promptData?: any;
}

const RequestRow = (props: RequestRowProps) => {
  const {
    request,
    properties,
    open = true,
    wFull = false,
    displayPreview = true,
    promptData,
  } = props;

  const org = useOrg();

  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [isScoresAddingLabel, setIsScoresAddingLabel] = useState(false);
  const [isScoresAdding, setIsScoresAdding] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [currentProperties, setCurrentProperties] = useState<
    {
      [key: string]: string;
    }[]
  >();

  const [currentScores, setCurrentScores] = useState<Record<string, number>>();

  const { setNotification } = useNotification();

  const promptId = useMemo(() => {
    return request.heliconeMetadata.customProperties?.["Helicone-Prompt-Id"] as
      | string
      | undefined;
  }, [request.heliconeMetadata.customProperties]);

  const sessionData = useMemo(() => {
    const sessionId = request.heliconeMetadata.customProperties?.[
      "Helicone-Session-Id"
    ] as string | undefined;
    return { sessionId };
  }, [request.heliconeMetadata.customProperties]);

  const experimentId = useMemo(() => {
    return request.heliconeMetadata.customProperties?.[
      "Helicone-Experiment-Id"
    ] as string | undefined;
  }, [request.heliconeMetadata.customProperties]);

  useEffect(() => {
    // find all the key values of properties and set them to currentProperties
    const currentProperties: {
      [key: string]: string;
    }[] = [];

    properties.forEach((property) => {
      if (
        request.heliconeMetadata.customProperties &&
        request.heliconeMetadata.customProperties.hasOwnProperty(property)
      ) {
        currentProperties.push({
          [property]: request.heliconeMetadata.customProperties[
            property
          ] as string,
        });
      }
    });

    setCurrentProperties(currentProperties);
    const currentScores: Record<string, number> =
      (request.heliconeMetadata.scores as Record<string, number>) || {};
    setCurrentScores(currentScores);
  }, [
    properties,
    request.heliconeMetadata.customProperties,
    request.heliconeMetadata.scores,
  ]);

  const onAddLabelHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAdding(true);

    const formData = new FormData(e.currentTarget);
    const key = formData.get("key") as string;
    const value = formData.get("value") as string;

    if (!key || !value || org?.currentOrg?.id === undefined) {
      setNotification("Error adding label", "error");
      setIsAdding(false);
      return;
    }
    try {
      const res = await addRequestLabel(
        request.id,
        org?.currentOrg?.id,
        key,
        value
      );

      if (res?.status === 200) {
        setNotification("Label added", "success");
        setCurrentProperties(
          currentProperties
            ? [
                ...currentProperties,
                {
                  [key]: value,
                },
              ]
            : [{ [key]: value }]
        );

        setIsAdding(false);
      } else {
        setNotification("Error adding label", "error");
        setIsAdding(false);
      }
    } catch (err) {
      console.error(err);
      setNotification(`Error adding label: ${err}`, "error");
      setIsAdding(false);
      return;
    }
  };

  const onAddScoreHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsScoresAdding(true);

    const formData = new FormData(e.currentTarget);
    const key = formData.get("key") as string;
    let value = formData.get("value") as any;
    let valueType = "number";

    if (!isNaN(Number(value))) {
      value = Number(value);
    } else if (value === "true") {
      value = true;
      valueType = "boolean";
    } else if (value === "false") {
      value = false;
      valueType = "boolean";
    } else {
      setNotification("Value must be a number or 'true'/'false'", "error");
      setIsScoresAdding(false);
      return;
    }

    if (currentScores && currentScores[key]) {
      setNotification("Score already exists", "error");
      setIsScoresAdding(false);
      return;
    }

    if (!key || org?.currentOrg?.id === undefined) {
      setNotification("Error adding score", "error");
      setIsScoresAdding(false);
      return;
    }
    try {
      const res = await addRequestScore(
        request.id,
        org?.currentOrg?.id,
        key,
        value
      );

      if (res?.status === 201) {
        setNotification("Score added", "success");
        setCurrentScores(
          currentScores
            ? {
                ...currentScores,
                [key]: value,
              }
            : {
                [key]: value,
              }
        );

        setIsScoresAdding(false);
      } else {
        setNotification("Error adding score", "error");
        setIsScoresAdding(false);
      }
    } catch (err) {
      console.error(err);
      setNotification(`Error adding score: ${err}`, "error");
      setIsScoresAdding(false);
      return;
    }
  };

  const [newDatasetModalOpen, setNewDatasetModalOpen] = useState(false);

  return (
    <div className="flex flex-col h-full space-y-8 pb-72 sentry-mask-me">
      <div className="flex flex-row items-center">
        <ul
          className={clsx(
            wFull && "2xl:grid-cols-4 2xl:gap-5",
            "grid grid-cols-1 gap-x-4 divide-y divide-gray-300 dark:divide-gray-700 justify-between text-sm w-full"
          )}
        >
          <li className="flex flex-row justify-between items-center py-2 gap-4">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              Created At
            </p>
            <p className="text-gray-700 dark:text-gray-300 truncate">
              {getUSDateFromString(request.heliconeMetadata.createdAt)}
            </p>
          </li>
          <li className="flex flex-row justify-between items-center py-2 gap-4">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              Model
            </p>
            <div className="">
              <ModelPill model={request.model} />
            </div>
          </li>
          {request.heliconeMetadata.status.statusType === "success" && (
            <li className="flex flex-row justify-between items-center py-2 gap-4">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                Prompt Tokens
              </p>
              <div className="flex flex-row items-center space-x-1">
                <p className="text-gray-700 truncate dark:text-gray-300">
                  {request.heliconeMetadata.promptTokens &&
                  request.heliconeMetadata.promptTokens >= 0
                    ? request.heliconeMetadata.promptTokens
                    : "not found"}
                </p>
              </div>
            </li>
          )}
          {request.heliconeMetadata.status.statusType === "success" && (
            <li className="flex flex-row justify-between items-center py-2 gap-4">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                Completion Tokens
              </p>
              <div className="flex flex-row items-center space-x-1">
                <p className="text-gray-700 truncate dark:text-gray-300">
                  {request.heliconeMetadata.completionTokens &&
                  request.heliconeMetadata.completionTokens >= 0
                    ? request.heliconeMetadata.completionTokens
                    : "not found"}
                </p>
              </div>
            </li>
          )}
          <li className="flex flex-row justify-between items-center py-2 gap-4">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              Latency
            </p>
            <p className="text-gray-700 dark:text-gray-300 truncate">
              <span>{Number(request.heliconeMetadata.latency) / 1000}s</span>
            </p>
          </li>
          <li className="flex flex-row justify-between items-center py-2 gap-4">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              Cost
            </p>
            <p className="text-gray-700 dark:text-gray-300 truncate">
              {request.heliconeMetadata.cost !== null &&
              request.heliconeMetadata.cost !== undefined
                ? `$${formatNumber(request.heliconeMetadata.cost)}`
                : request.heliconeMetadata.status.statusType === "success"
                ? "Calculating..."
                : "N/A"}
            </p>
          </li>
          <li className="flex flex-row justify-between items-center py-2 gap-4">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              Status
            </p>
            <StatusBadge
              statusType={request.heliconeMetadata.status.statusType}
              errorCode={request.heliconeMetadata.status.code}
            />
          </li>
          <li className="flex flex-row justify-between items-center py-2 gap-4">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              User
            </p>
            <p className="text-gray-700 dark:text-gray-300 truncate">
              {request.heliconeMetadata.user}
            </p>
          </li>
          <li className="flex flex-row justify-between items-center py-2 gap-4">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              Path
            </p>
            <p className="text-gray-700 dark:text-gray-300 truncate">
              {getPathName(request.heliconeMetadata.path)}
            </p>
          </li>
          {displayPreview && (
            <li className="flex flex-row justify-between items-center py-2 gap-4">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                ID
              </p>
              <p className="text-gray-700 dark:text-gray-300 truncate">
                {request.id}
              </p>
            </li>
          )}
          {request.schema.request.temperature !== undefined &&
            request.schema.request.temperature !== null && (
              <li className="flex flex-row justify-between items-center py-2">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  Temperature
                </p>
                <p className="text-gray-700 dark:text-gray-300 truncate">
                  {Number(request.schema.request.temperature || 0).toFixed(2)}
                </p>
              </li>
            )}

          {request.heliconeMetadata.timeToFirstToken !== undefined &&
            request.heliconeMetadata.timeToFirstToken !== null && (
              <li className="flex flex-row justify-between items-center py-2">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  Time to First Token
                </p>
                <p className="text-gray-700 dark:text-gray-300 truncate">
                  {request.heliconeMetadata.timeToFirstToken}ms
                </p>
              </li>
            )}
        </ul>
      </div>
      <div className="flex flex-col gap-4">
        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm items-center flex">
          <div className="flex flex-row items-center space-x-1">
            <span>Add to Dataset</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setNewDatasetModalOpen(true);
                    }}
                    className="ml-1.5 p-0.5 shadow-sm bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md h-fit"
                  >
                    <PlusIcon className="h-3 w-3 text-gray-500" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Add to Dataset</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm items-center flex">
          Custom Properties{" "}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setIsAddingLabel(!isAddingLabel);
                  }}
                  className="ml-1.5 p-0.5 shadow-sm bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md h-fit"
                >
                  {isAddingLabel ? (
                    <MinusIcon className="h-3 w-3 text-gray-500" />
                  ) : (
                    <PlusIcon className="h-3 w-3 text-gray-500" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>Add a new label</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {isAddingLabel && (
          <form
            onSubmit={onAddLabelHandler}
            className="flex flex-row items-end space-x-2 py-4 mb-4 border-b border-gray-300 dark:border-gray-700"
          >
            <div className="flex flex-col space-y-1">
              <label
                htmlFor="key"
                className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100"
              >
                Key
              </label>
              <div className="">
                <Input
                  type="text"
                  name="key"
                  id="key"
                  required
                  className={clsx(
                    "bg-white dark:bg-black block w-full rounded-md px-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm placeholder:text-gray-400 border border-gray-300 dark:border-gray-700 sm:leading-6 h-full"
                  )}
                  placeholder={"Key"}
                />
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              <label
                htmlFor="value"
                className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100"
              >
                Value
              </label>
              <div className="">
                <Input
                  type="text"
                  name="value"
                  id="value"
                  required
                  className={clsx(
                    "bg-white dark:bg-black block w-full rounded-md px-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm placeholder:text-gray-400 border border-gray-300 dark:border-gray-700 sm:leading-6 h-full"
                  )}
                  placeholder={"Value"}
                />
              </div>
            </div>
            <Button size="sm">
              {isAdding && (
                <ArrowPathIcon className="w-4 h-4 mr-1.5 animate-spin" />
              )}
              Add
            </Button>
          </form>
        )}
        {currentProperties && currentProperties.length > 0 && (
          <div className="flex flex-wrap gap-4 text-sm items-center pt-2">
            {currentProperties
              .filter(
                (property) =>
                  ![
                    "Helicone-Prompt-Id",
                    "Helicone-Session-Id",
                    "Helicone-Experiment-Id",
                  ].includes(Object.keys(property)[0])
              )
              .map((property, i) => {
                const key = Object.keys(property)[0];
                return (
                  <li className="flex flex-row items-center space-x-2" key={i}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm_sleek"
                            className="flex flex-row items-center space-x-2 truncate select-text"
                            onClick={() => {
                              try {
                                navigator.clipboard.writeText(
                                  `${property[key]}`
                                );
                                setNotification(
                                  "Copied to clipboard!",
                                  "success"
                                );
                              } catch (error) {
                                console.error("Failed to copy:", error);
                                setNotification(
                                  "Failed to copy to clipboard",
                                  "error"
                                );
                              }
                            }}
                          >
                            <span>{key}:</span> <span>{property[key]}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Click to copy</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                );
              })}
          </div>
        )}
        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm items-center flex">
          Scores{" "}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setIsScoresAddingLabel(!isScoresAddingLabel);
                  }}
                  className="ml-1.5 p-0.5 shadow-sm bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md h-fit"
                >
                  {isScoresAddingLabel ? (
                    <MinusIcon className="h-3 w-3 text-gray-500" />
                  ) : (
                    <PlusIcon className="h-3 w-3 text-gray-500" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>Add a new score</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {isScoresAddingLabel && (
          <form
            onSubmit={onAddScoreHandler}
            className="flex flex-row items-end space-x-2 py-4 mb-4 border-b border-gray-300 dark:border-gray-700"
          >
            <div className="flex flex-col space-y-1">
              <label
                htmlFor="key"
                className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100"
              >
                Key
              </label>
              <div className="">
                <Input
                  type="text"
                  name="key"
                  id="key"
                  required
                  className={clsx(
                    "bg-white dark:bg-black block w-full rounded-md px-2  text-sm text-gray-900 dark:text-gray-100 shadow-sm placeholder:text-gray-400 border border-gray-300 dark:border-gray-700 sm:leading-6 h-full"
                  )}
                  placeholder={"Key"}
                />
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              <label
                htmlFor="value"
                className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100"
              >
                Value
              </label>
              <div className="">
                <Input
                  //@ts-ignore
                  type="text"
                  name="value"
                  id="value"
                  required
                  className={clsx(
                    "bg-white dark:bg-black block w-full rounded-md px-2  text-sm text-gray-900 dark:text-gray-100 shadow-sm placeholder:text-gray-400 border border-gray-300 dark:border-gray-700 sm:leading-6 h-full"
                  )}
                  placeholder={"Value"}
                />
              </div>
            </div>
            <Button size="sm" type="submit">
              {isAdding && (
                <ArrowPathIcon className="w-4 h-4 mr-1.5 animate-spin" />
              )}
              Add
            </Button>
          </form>
        )}

        {currentScores && Object.keys(currentScores).length > 0 && (
          <div className="flex flex-wrap gap-4 text-sm items-center pt-2">
            {Object.entries(currentScores)
              .filter(([key]) => key !== "helicone-score-feedback")
              .map(([key, value]) => (
                <li
                  className="flex flex-col space-y-1 justify-between text-left p-2.5 shadow-sm border border-gray-300 dark:border-gray-700 rounded-lg min-w-[5rem]"
                  key={key}
                >
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {key.replace("-hcone-bool", "")}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {key.endsWith("-hcone-bool")
                      ? value === 1
                        ? "true"
                        : "false"
                      : Number(value)}
                  </p>
                </li>
              ))}
          </div>
        )}
      </div>
      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm items-center flex">
        Helicone Settings{" "}
      </div>
      <div className="flex w-full justify-between gap-8">
        <div className="flex flex-col gap-2">
          {promptId && (
            <div className="flex flex-row items-center space-x-2">
              <Button
                variant="outline"
                size="sm_sleek"
                className="flex flex-row items-center space-x-2 truncate"
                asChild
              >
                <Link href={`/prompts/${promptData?.id}`}>
                  <span>Prompt:</span> <span>{promptId}</span>
                </Link>
              </Button>
            </div>
          )}
          {sessionData.sessionId && (
            <>
              <div className="flex flex-row items-center space-x-2 relative">
                <Button
                  variant="outline"
                  size="sm_sleek"
                  className="flex flex-row items-center space-x-2 truncate"
                  asChild
                >
                  <Link
                    href={`/sessions/${encodeURIComponent(
                      sessionData.sessionId
                    )}`}
                  >
                    <span>Session:</span> <span>{sessionData.sessionId}</span>
                  </Link>
                </Button>
              </div>
            </>
          )}
          {experimentId && (
            <div className="flex flex-row items-center space-x-2">
              <Button variant="outline" size="sm_sleek" asChild>
                <Link href={`/experiments/${experimentId}`}>
                  Experiment: {experimentId}
                </Link>
              </Button>
            </div>
          )}
        </div>
        <FeedbackButtons
          requestId={request.id}
          defaultValue={
            request.heliconeMetadata.scores &&
            request.heliconeMetadata.scores["helicone-score-feedback"]
              ? Number(
                  request.heliconeMetadata.scores["helicone-score-feedback"]
                ) === 1
                ? true
                : false
              : null
          }
        />
      </div>

      {displayPreview && (
        <div className="flex flex-col space-y-8">
          <div className="flex flex-col space-y-2">
            <RenderMappedRequest
              mapperContent={request}
              promptData={promptData}
            />
          </div>
        </div>
      )}
      <div className="min-h-[100px]">{/* space */}</div>
      <ThemedModal open={newDatasetModalOpen} setOpen={setNewDatasetModalOpen}>
        <NewDataset
          request_ids={[request.id]}
          onComplete={() => setNewDatasetModalOpen(false)}
        />
      </ThemedModal>
    </div>
  );
};

export default RequestRow;
