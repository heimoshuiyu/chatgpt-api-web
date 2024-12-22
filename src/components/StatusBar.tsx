import {
  CubeIcon,
  BanknotesIcon,
  ChatBubbleLeftEllipsisIcon,
  ScissorsIcon,
  SwatchIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

import { ChatStore } from "@/types/chatstore";
import { models } from "@/types/models";
import { Tr } from "@/translate";
import { getTotalCost } from "@/utils/totalCost";

const StatusBar = (props: {
  chatStore: ChatStore;
  setShowSettings: (show: boolean) => void;
  setShowSearch: (show: boolean) => void;
}) => {
  const { chatStore, setShowSettings, setShowSearch } = props;
  return (
    <div className="navbar bg-base-100 p-0">
      <div className="navbar-start">
        <div className="dropdown lg:hidden">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
          >
            <li>
              <p>
                <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                Tokens: {chatStore.totalTokens}/{chatStore.maxTokens}
              </p>
            </li>
            <li>
              <p>
                <ScissorsIcon className="h-4 w-4" />
                Cut:
                {chatStore.postBeginIndex}/
                {chatStore.history.filter(({ hide }) => !hide).length}
              </p>
            </li>
            <li>
              <p>
                <BanknotesIcon className="h-4 w-4" />
                Cost: ${chatStore.cost.toFixed(4)}
              </p>
            </li>
          </ul>
        </div>
      </div>
      <div
        className="navbar-center cursor-pointer py-1"
        onClick={() => {
          setShowSettings(true);
        }}
      >
        {/* the long staus bar */}
        <div className="stats shadow hidden lg:inline-grid">
          <div className="stat">
            <div className="stat-figure text-secondary">
              <CubeIcon className="h-10 w-10" />
            </div>
            <div className="stat-title">Model</div>
            <div className="stat-value text-base">{chatStore.model}</div>
            <div className="stat-desc">
              {models[chatStore.model]?.price?.prompt * 1000 * 1000} $/M tokens
            </div>
          </div>
          <div className="stat">
            <div className="stat-figure text-secondary">
              <SwatchIcon className="h-10 w-10" />
            </div>
            <div className="stat-title">Mode</div>
            <div className="stat-value text-base">
              {chatStore.streamMode ? Tr("STREAM") : Tr("FETCH")}
            </div>
            <div className="stat-desc">STREAM/FETCH</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-secondary">
              <ChatBubbleLeftEllipsisIcon className="h-10 w-10" />
            </div>
            <div className="stat-title">Tokens</div>
            <div className="stat-value text-base">{chatStore.totalTokens}</div>
            <div className="stat-desc">Max: {chatStore.maxTokens}</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-secondary">
              <ScissorsIcon className="h-10 w-10" />
            </div>
            <div className="stat-title">Cut</div>
            <div className="stat-value text-base">
              {chatStore.postBeginIndex}
            </div>
            <div className="stat-desc">
              Max: {chatStore.history.filter(({ hide }) => !hide).length}
            </div>
          </div>

          <div className="stat">
            <div className="stat-figure text-secondary">
              <BanknotesIcon className="h-10 w-10" />
            </div>
            <div className="stat-title">Cost</div>
            <div className="stat-value text-base">
              ${chatStore.cost.toFixed(4)}
            </div>
            <div className="stat-desc">
              Accumulated: ${getTotalCost().toFixed(2)}
            </div>
          </div>
        </div>

        {/* the short status bar */}
        <div className="indicator lg:hidden">
          {chatStore.totalTokens !== 0 && (
            <span className="indicator-item badge badge-primary">
              Tokens: {chatStore.totalTokens}
            </span>
          )}
          <a className="btn btn-ghost text-base sm:text-xl p-0">
            <SparklesIcon className="h-4 w-4 hidden sm:block" />
            {chatStore.model}
          </a>
        </div>
      </div>
      <div className="navbar-end">
        <button
          className="btn btn-ghost btn-circle"
          onClick={(event) => {
            // stop propagation to parent
            event.stopPropagation();

            setShowSearch(true);
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
        <button
          className="btn btn-ghost btn-circle hidden sm:block"
          onClick={() => setShowSettings(true)}
        >
          <div className="indicator">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>

            <span className="badge badge-xs badge-primary indicator-item"></span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
